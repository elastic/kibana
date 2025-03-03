/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

import { getHostVmClient } from '../../../../scripts/endpoint/common/vm_services';

export const agentActions = (on: Cypress.PluginEvents): void => {
  on('task', {
    uninstallAgentFromHost: async ({
      hostname,
      uninstallToken,
    }: {
      hostname: string;
      uninstallToken?: string;
    }): Promise<string> => {
      const hostVmClient = getHostVmClient(hostname);

      try {
        return (
          await hostVmClient.exec(
            `sudo elastic-agent uninstall -f ${
              uninstallToken ? `--uninstall-token ${uninstallToken}` : ''
            }`
          )
        ).stdout;
      } catch (err) {
        return err.stderr;
      }
    },

    isAgentAndEndpointUninstalledFromHost: async ({
      hostname,
    }: {
      hostname: string;
      uninstallToken?: string;
    }): Promise<boolean> => {
      const hostVmClient = getHostVmClient(hostname);
      const lsOutput = await hostVmClient.exec('ls /opt/Elastic');

      if (lsOutput.stdout === '') {
        return true;
      }

      return false;
    },
  });
};
