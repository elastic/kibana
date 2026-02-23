/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../common/endpoint/data_loaders/utils';
import { createMultipassHostVmClient, findVm } from '../common/vm_services';

export interface RunEnableRemoteAccessOptions {
  multipassNameFilter?: string;
  enableRdp: boolean;
  enableSshPasswordAuth: boolean;
  setUbuntuPassword: boolean;
  ubuntuPassword?: string;
  log?: ToolingLog;
}

const setUbuntuPassword = async (vmName: string, password: string, log: ToolingLog) => {
  const vm = createMultipassHostVmClient(vmName, log);
  await vm.exec(
    `bash -lc "echo ubuntu:${password} | sudo chpasswd && sudo passwd -S ubuntu"`
  );
};

const enableSshPasswordAuth = async (vmName: string, log: ToolingLog) => {
  const vm = createMultipassHostVmClient(vmName, log);

  // Use a dedicated conf file so we don't rely on distro-specific sshd_config layouts.
  await vm.exec(
    `bash -lc "sudo mkdir -p /etc/ssh/sshd_config.d && echo 'PasswordAuthentication yes' | sudo tee /etc/ssh/sshd_config.d/99-demo-password-auth.conf >/dev/null && (sudo systemctl restart ssh || sudo systemctl restart sshd)"`
  );
};

const enableRdpXfce = async (vmName: string, log: ToolingLog) => {
  const vm = createMultipassHostVmClient(vmName, log);

  // Install a lightweight desktop and XRDP.
  await vm.exec(
    `bash -lc "sudo DEBIAN_FRONTEND=noninteractive apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y xrdp xorgxrdp xfce4 xfce4-goodies dbus-x11"`
  );

  // Deterministic session startup (avoids /etc/X11/Xsession variance).
  await vm.exec(
    `bash -lc "sudo cp -a /etc/xrdp/startwm.sh /etc/xrdp/startwm.sh.bak.demo 2>/dev/null || true; sudo tee /etc/xrdp/startwm.sh >/dev/null <<'EOF'\n#!/bin/sh\n\nif test -r /etc/profile; then\n  . /etc/profile\nfi\n\nif test -r ~/.profile; then\n  . ~/.profile\nfi\n\nunset DBUS_SESSION_BUS_ADDRESS\nunset XDG_RUNTIME_DIR\nexport XDG_SESSION_TYPE=x11\n\nexec dbus-launch --exit-with-session startxfce4\nEOF\nsudo chmod 755 /etc/xrdp/startwm.sh"`
  );

  // Ensure services are enabled and running.
  await vm.exec(`bash -lc "sudo systemctl enable --now xrdp xrdp-sesman"`);

  // Basic sanity checks (non-fatal; for logging)
  await vm.exec(`bash -lc "ss -lntp | egrep ':(22|3389)\\b' || true"`, { silent: true });
};

export const runEnableRemoteAccess = async (options: RunEnableRemoteAccessOptions): Promise<void> => {
  const log = options.log ?? createToolingLogger();
  const filter = options.multipassNameFilter ? new RegExp(options.multipassNameFilter) : undefined;

  const { data: vms } = await findVm('multipass');
  const targets = filter ? vms.filter((n) => filter.test(n)) : vms;

  if (targets.length === 0) {
    log.warning(`No multipass VMs found${filter ? ` matching [${filter}]` : ''}.`);
    return;
  }

  log.info(`Enabling remote access on ${targets.length} multipass VM(s)`);

  await log.indent(4, async () => {
    for (const vmName of targets) {
      log.info(`VM: ${vmName}`);

      await log.indent(2, async () => {
        if (options.setUbuntuPassword) {
          if (!options.ubuntuPassword) {
            throw new Error(`--setUbuntuPassword requires --ubuntuPassword`);
          }
          await setUbuntuPassword(vmName, options.ubuntuPassword, log);
        }

        if (options.enableSshPasswordAuth) {
          await enableSshPasswordAuth(vmName, log);
        }

        if (options.enableRdp) {
          await enableRdpXfce(vmName, log);
        }
      });
    }
  });
};


