/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createMultipassHostVmClient, findVm } from '../common/vm_services';

export interface RunInstallBrowsersOptions {
  installFirefox: boolean;
  installChrome: boolean;
  multipassNameFilter?: string;
  log?: ToolingLog;
}

const detectArchCmd = `uname -m`;

export const runInstallBrowsers = async (options: RunInstallBrowsersOptions): Promise<void> => {
  const log = options.log ?? createToolingLogger();
  const filter = options.multipassNameFilter ? new RegExp(options.multipassNameFilter) : undefined;

  const { data: vms } = await findVm('multipass');
  const targets = filter ? vms.filter((n) => filter.test(n)) : vms;

  if (targets.length === 0) {
    log.warning(`No multipass VMs found${filter ? ` matching [${filter}]` : ''}.`);
    return;
  }

  log.info(`Installing browsers on ${targets.length} multipass VM(s)`);

  await log.indent(4, async () => {
    for (const vmName of targets) {
      log.info(`VM: ${vmName}`);

      await log.indent(2, async () => {
        const vm = createMultipassHostVmClient(vmName, log);
        const arch = (await vm.exec(detectArchCmd, { silent: true })).stdout.trim();
        log.info(`arch: ${arch}`);

        if (options.installFirefox) {
          log.info(`Installing Firefox`);
          const hasFirefox =
            (await vm.exec('command -v firefox >/dev/null 2>&1 && echo 0 || echo 1', { silent: true }))
              .stdout.trim() === '0';
          if (!hasFirefox) {
            const hasSnap =
              (await vm.exec('command -v snap >/dev/null 2>&1 && echo 0 || echo 1', { silent: true }))
                .stdout.trim() === '0';
            if (hasSnap) {
              await vm.exec('sudo snap install firefox || sudo snap refresh firefox');
            } else {
              await vm.exec('sudo apt-get update -y');
              await vm.exec('sudo DEBIAN_FRONTEND=noninteractive apt-get install -y firefox');
            }
          } else {
            log.info(`Firefox already installed`);
          }
        }

        if (options.installChrome) {
          if (arch === 'x86_64' || arch === 'amd64') {
            log.info(`Installing Google Chrome (amd64)`);
            const hasChrome = (
              await vm.exec(
                'command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1'
              )
            ).exitCode === 0;
            if (!hasChrome) {
              await vm.exec(
                'tmpdir=$(mktemp -d) && cd $tmpdir && curl -fsSL -o google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && sudo dpkg -i google-chrome.deb || sudo apt-get -f install -y'
              );
            } else {
              log.info(`Google Chrome already installed`);
            }
          } else {
            log.info(`Installing Chromium (non-amd64)`);
            const hasChromium =
              (await vm.exec('command -v chromium >/dev/null 2>&1 && echo 0 || echo 1', { silent: true }))
                .stdout.trim() === '0';
            if (!hasChromium) {
              const hasSnap =
                (await vm.exec('command -v snap >/dev/null 2>&1 && echo 0 || echo 1', { silent: true }))
                  .stdout.trim() === '0';
              if (hasSnap) {
                await vm.exec('sudo snap install chromium || sudo snap refresh chromium');
              } else {
                await vm.exec('sudo apt-get update -y');
                await vm.exec(
                  'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium-browser || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium'
                );
              }
            } else {
              log.info(`Chromium already installed`);
            }
          }
        }
      });
    }
  });
};


