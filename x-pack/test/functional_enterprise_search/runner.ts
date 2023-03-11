/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { resolve } from 'path';
import Url from 'url';

import { withProcRunner } from '@kbn/dev-proc-runner';
import { setupEnterpriseSearch, cleanupEnterpriseSearch } from './enterprise_search_server';

import type { FtrProviderContext } from './ftr_provider_context';

export async function withEnterpriseSearch(
  context: FtrProviderContext,
  runner: (runnerEnv: Record<string, string>) => Promise<void>
) {
  const log = context.getService('log');
  await setupEnterpriseSearch(log);

  try {
    await runner({});
  } finally {
    cleanupEnterpriseSearch(log);
  }
}

export async function runEnterpriseSearchTests(
  context: FtrProviderContext,
  cypressCommand: string
) {
  const log = context.getService('log');
  const config = context.getService('config');
  await withEnterpriseSearch(context, (runnerEnv) =>
    withProcRunner(log, async (procs) => {
      await procs.run('cypress', {
        cmd: 'sh',
        args: [
          `${resolve(__dirname, '../../plugins/enterprise_search/cypress.sh')}`,
          `${cypressCommand}`,
          'as',
        ],
        cwd: resolve(__dirname, '../../plugins/enterprise_search'),
        env: {
          FORCE_COLOR: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_baseUrl: Url.format(config.get('servers.kibana')),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_protocol: config.get('servers.kibana.protocol'),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_hostname: config.get('servers.kibana.hostname'),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          CYPRESS_configport: config.get('servers.kibana.port'),
          CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
          CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
          CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
          CYPRESS_KIBANA_URL: Url.format({
            protocol: config.get('servers.kibana.protocol'),
            hostname: config.get('servers.kibana.hostname'),
            port: config.get('servers.kibana.port'),
          }),
          ...runnerEnv,
          ...process.env,
        },
        wait: true,
      });
    })
  );
}

export async function EnterpriseSearchCypressCliTestRunner(context: FtrProviderContext) {
  await runEnterpriseSearchTests(context, 'run');
}

export async function EnterpriseSearchCypressVisualTestRunner(context: FtrProviderContext) {
  await runEnterpriseSearchTests(context, 'open');
}
