/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import Url from 'url';
import { withProcRunner } from '@kbn/dev-proc-runner';

import { FtrProviderContext } from './ftr_provider_context';

export async function DefendWorkflowsCypressCliTestRunner(context: FtrProviderContext) {
  await startDefendWorkflowsCypress(context, 'dw:run');
}

export async function DefendWorkflowsCypressVisualTestRunner(context: FtrProviderContext) {
  await startDefendWorkflowsCypress(context, 'dw:open');
}

function startDefendWorkflowsCypress(context: FtrProviderContext, cypressCommand: string) {
  const log = context.getService('log');
  const config = context.getService('config');
  return withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [`cypress:${cypressCommand}`],
      cwd: resolve(__dirname, '../../plugins/security_solution'),
      env: {
        FORCE_COLOR: '1',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_baseUrl: Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        }),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_protocol: config.get('servers.kibana.protocol'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_hostname: config.get('servers.kibana.hostname'),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        CYPRESS_configport: config.get('servers.kibana.port'),
        CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
        CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.kibana.username'),
        CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.kibana.password'),
        CYPRESS_KIBANA_URL: Url.format({
          protocol: config.get('servers.kibana.protocol'),
          hostname: config.get('servers.kibana.hostname'),
          port: config.get('servers.kibana.port'),
        }),
        ...process.env,
      },
      wait: true,
    });
  });
}
