/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { prefixedOutputLogger } from '../common/utils';
import type { ProvisionedEndpoint, Rsa2026DemoConfig } from './types';

/**
 * Installs a lightweight graphical desktop + RDP server (XRDP) so Multipass VMs can be accessed via GUI.
 *
 * - Desktop: XFCE
 * - Remote access: XRDP on port 3389
 *
 * This is intended for local development. It is safe to re-run (idempotent).
 */
export const setupGui = async (
  endpoints: ProvisionedEndpoint[],
  log: ToolingLog,
  config: Rsa2026DemoConfig
): Promise<void> => {
  const logger = prefixedOutputLogger('setupGui()', log);

  if (!config.enableGui) {
    logger.info('GUI setup disabled via config; skipping');
    return;
  }

  const vmUser = config.vmGuiUser || 'ubuntu';
  const vmPassword = config.vmGuiPassword || 'changeme';

  return logger.indent(4, async () => {
    for (const endpoint of endpoints) {
      // Only supported on Multipass in this demo (CI/vagrant is typically headless).
      if (endpoint.hostVm.type !== 'multipass') {
        logger.info(`Skipping GUI setup for non-multipass VM: ${endpoint.hostname} (${endpoint.hostVm.type})`);
        continue;
      }

      logger.info(`Installing GUI (XFCE + XRDP) on ${endpoint.hostname}`);

      // Ensure user exists (on Multipass Ubuntu, `ubuntu` is present).
      await endpoint.hostVm.exec(`id -u ${vmUser} >/dev/null 2>&1 || sudo useradd -m -s /bin/bash ${vmUser}`);

      // Set password for RDP login
      await endpoint.hostVm.exec(`echo "${vmUser}:${vmPassword}" | sudo chpasswd`);

      // Install packages (idempotent)
      // If a previous apt/dpkg run was interrupted (common when disk ran out), recover first.
      await endpoint.hostVm.exec('sudo dpkg --configure -a || true', { silent: true });
      await endpoint.hostVm.exec('sudo DEBIAN_FRONTEND=noninteractive apt-get -f install -y || true', {
        silent: true,
      });
      await endpoint.hostVm.exec('sudo apt-get clean || true', { silent: true });

      await endpoint.hostVm.exec('sudo DEBIAN_FRONTEND=noninteractive apt-get update', { silent: true });
      await endpoint.hostVm.exec(
        // `xorgxrdp` is required for the Xorg backend; without it, RDP often results in a black screen.
        'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y xfce4 xfce4-goodies xrdp xorgxrdp xserver-xorg-legacy dbus-x11 xorg',
        { silent: true }
      );

      // Allow XRDP sessions to start Xorg. Default "console" can cause /dev/tty0 permission errors.
      await endpoint.hostVm.exec(
        "sudo bash -lc \"if [ -f /etc/X11/Xwrapper.config ]; then sed -i.bak 's/^allowed_users=.*/allowed_users=anybody/' /etc/X11/Xwrapper.config; fi\"",
        { silent: true }
      );

      // On Ubuntu, `xorgxrdp` ships its config at /etc/X11/xrdp/xorg.conf. Ensure sesman points to it.
      await endpoint.hostVm.exec(
        "sudo bash -lc \"if [ -f /etc/xrdp/sesman.ini ]; then sed -i.bak 's|^param=xrdp/xorg.conf$|param=/etc/X11/xrdp/xorg.conf|g' /etc/xrdp/sesman.ini; fi\"",
        { silent: true }
      );

      // Multipass VMs often don't expose /dev/dri/* render nodes. The default xorgxrdp config references one,
      // which can cause Xorg startup failures (black screen).
      await endpoint.hostVm.exec(
        "sudo bash -lc \"if [ -f /etc/X11/xrdp/xorg.conf ] && [ ! -e /dev/dri/renderD128 ]; then sed -i.bak '/Option \\\"DRMDevice\\\"/d; /Option \\\"DRI3\\\"/d' /etc/X11/xrdp/xorg.conf; fi\"",
        { silent: true }
      );

      // Configure XRDP to start XFCE (use `startxfce4` which is the common XRDP-compatible entrypoint)
      await endpoint.hostVm.exec(
        `sudo -u ${vmUser} bash -lc "printf '%s\\n' startxfce4 > /home/${vmUser}/.xsession"`
      );
      await endpoint.hostVm.exec(`sudo chown ${vmUser}:${vmUser} /home/${vmUser}/.xsession`, { silent: true });

      // Ensure xrdp can read certs
      await endpoint.hostVm.exec('sudo adduser xrdp ssl-cert || true', { silent: true });

      // Enable and start service
      await endpoint.hostVm.exec('sudo systemctl enable --now xrdp xrdp-sesman', { silent: true });
      await endpoint.hostVm.exec('sudo systemctl restart xrdp xrdp-sesman', { silent: true });

      // Allow RDP port if ufw is enabled (best-effort)
      await endpoint.hostVm.exec('sudo ufw allow 3389/tcp || true', { silent: true });

      // Log connection info (best-effort IP retrieval)
      const ip = await endpoint.hostVm
        .exec("hostname -I | awk '{print $1}'", { silent: true })
        .then((r) => r.stdout.trim())
        .catch(() => '');

      if (ip) {
        logger.info(
          `GUI ready for ${endpoint.hostname}. Connect via RDP to ${ip}:3389 (user: ${vmUser}, password: <configured>)`
        );
      } else {
        logger.info(
          `GUI ready for ${endpoint.hostname}. Get IP via: multipass info ${endpoint.hostname} (then RDP to <ip>:3389, user: ${vmUser})`
        );
      }
    }
  });
};


