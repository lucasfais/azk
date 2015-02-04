import { config, async, t, log, path } from 'azk';
import { VM  }   from 'azk/agent/vm';
import { Balancer } from 'azk/agent/balancer';
import { net as net_utils } from 'azk/utils';
import { AgentStartError } from 'azk/utils/errors';
import { Api } from 'azk/agent/api';

var qfs = require('q-io/fs');

var Server = {
  server: null,
  vm_started: false,

  // Warning: Only use test in mac
  vm_enabled: true,

  // TODO: log start machine steps
  start() {
    return async(this, function* () {
      log.info_t("commands.agent.starting");

      // Start api
      yield Api.start();

      // Virtual machine is required?
      if (this.vm_enabled && config('agent:requires_vm')) {
        yield this.installVM(true);
      }

      // Load balancer
      yield this.installBalancer();

      log.info_t("commands.agent.started");
    });
  },

  stop() {
    return async(this, function* () {
      yield Api.stop();
      yield this.removeBalancer();
      if (config('agent:requires_vm')) {
        yield this.stopVM();
      }
    });
  },

  installBalancer() {
    return Balancer.start(this.vm_enabled);
  },

  removeBalancer() {
    return Balancer.stop();
  },

  installVM(start = false) {
    var vm_name = config("agent:vm:name");
    return async(this, function* (notify) {
      var installed = yield VM.isInstalled(vm_name);
      var running   = (installed) ? yield VM.isRunnig(vm_name) : false;

      if (!installed) {
        var opts = {
          name: vm_name,
          ip  : config("agent:vm:ip"),
          boot: config("agent:vm:boot_disk"),
          data: config("agent:vm:data_disk"),
        };

        yield VM.init(opts);
      }

      if (!running && start) {
        yield VM.start(vm_name);

        // Wait for vm start
        var n = (status) => notify({ type: "status", context: "vm", status });
        n("wait");
        var address = `tcp://${config("agent:vm:ip")}:2376`;
        var success = yield net_utils.waitService(address, 10, { context: "vm" });
        if (!success) {
          throw new AgentStartError(t("errors.not_vm_start"));
        }
        n("initialized");

        // Upload key
        n("upkey");
        var key = config('agent:vm:ssh_key') + '.pub';
        var authoried = config('agent:vm:authorized_key');
        yield VM.copyFile(vm_name, key, authoried);

        // Get docker keys
        var files = ['ca.pem', 'cert.pem', 'key.pem'];
        var origin, dest, pems = config('paths:pems');
        yield qfs.makeTree(pems);

        // Copy files
        // TODO: Make downloads asyncs
        n("docker_keys");
        for (var i = 0; i < files.length; i++) {
          origin = path.join("/home/docker/.docker", files[i]);
          dest   = path.join(pems, files[i]);
          yield VM
            .copyVMFile(vm_name, origin, dest)
            .fail(() => {
              throw Error(`Erro to download file: ${origin}`);
            });
        }
      }

      // Mark installed
      this.vm_started = true;
    });
  },

  stopVM(running) {
    var vm_name = config("agent:vm:name");
    return async(this, function* () {
      running = (running === null) ? (yield VM.isRunnig(vm_name)) : false;
      if (running) {
        yield VM.stop(vm_name, !this.vm_started);
      }
    });
  },
};

export { Server };
