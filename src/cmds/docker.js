import { _, async, log, config, utils } from 'azk';
import { InteractiveCmds } from 'azk/cli/interactive_cmds';
import { Helpers } from 'azk/cli/command';

class Cmd extends InteractiveCmds {
  run_docker() {
    return async(this, function* () {
      var cmd, _path;
      var args = _.map(process.argv.slice(3), (arg) => {
        return arg.match(/^.* .*$/) ? `\\"${arg}\\"` : arg;
      });

      if (!config('agent:requires_vm')) {
        cmd = `/bin/sh -c "docker ${args.join(" ")}"`;
      } else {
        // Require agent is started
        yield Helpers.requireAgent(this);

        var point = config('agent:vm:mount_point');

        _path = utils.docker.resolvePath(this.cwd, point);

        cmd = `azk vm ssh -t "cd ${_path}; docker ${args.join(" ")}" 2>/dev/null`;
      }

      log.debug("docker options: %s", cmd);
      return this.execSh(cmd);
    });
  }

  action(opts) {
    return this.run_docker(opts);
  }
}

export function init(cli) {
  return (new Cmd('docker [*dockerargs]', cli));
}
