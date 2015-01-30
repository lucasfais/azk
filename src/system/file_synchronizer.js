import { _, async, config, defer } from 'azk';
var forever = require('forever-monitor');

var sys = require('sys')
var exec = require('child_process').exec;

var FileSynchronizer = {

  start(system) {
    console.log("do the job rigth now!");
    console.log(system.syncPaths);

    var vm_ip = config('agent:vm:ip');
    var ssh_url  = `ssh:\/\/${config('agent:vm:user')}@${vm_ip}`;
    var ssh_opts = "StrictHostKeyChecking=no -o LogLevel=quiet -o UserKnownHostsFile=/dev/null";
    var ssh_args = `-i ${config('agent:vm:ssh_key')} -o ${ssh_opts}`;

    console.log(ssh_url);
    console.log(ssh_args);

    _.each(system.syncPaths, (target, source) => {
      var args  = [
        //"/usr/local/bin/fswatch",
        //"-o", source, " | xargs -n1 -I{} ",
        "unison", source, ssh_url + "/" + target, "-sshargs", + '"' + ssh_args + '"'
      ];

      var cmd = args.join(" ");
      console.log(`starting unison: ${cmd}`);

      function puts(error, stdout, stderr) { sys.puts(stdout) }
      exec(cmd, puts);

      // return defer((resolve, reject) => {
      //   change_status("starting");
      //   this.child = forever.start(args, {
      //     max : 5,
      //     silent : true,
      //     pidFile: config("paths:unfsd_pid")
      //   });

      //   this.child.on('start', () => {
      //     change_status("started", { port: port, file: file });
      //     resolve();
      //   });
      // });
    });
  },
}

export { FileSynchronizer }

