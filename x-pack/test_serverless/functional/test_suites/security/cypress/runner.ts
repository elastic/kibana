/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { withProcRunner } from '@kbn/dev-proc-runner';
import Url from 'url';

import { FtrProviderContext } from '../../../ftr_provider_context';

export type { FtrProviderContext } from '../../../ftr_provider_context';

export async function SecuritySolutionCypressTestRunner(
  { getService }: FtrProviderContext,
  command: string
) {
  const log = getService('log');
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  await esArchiver.load('x-pack/test/security_solution_cypress/es_archives/auditbeat');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: [command],
      cwd: resolve(__dirname),
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        CYPRESS_BASE_URL: Url.format(config.get('servers.kibana')),
        CYPRESS_ELASTICSEARCH_URL: Url.format(config.get('servers.elasticsearch')),
        CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
        CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
      },
      wait: true,
    });
  });
}

export async function SecuritySolutionServerlessVisualTestRunner(context: FtrProviderContext) {
  return SecuritySolutionCypressTestRunner(context, 'cypress:open');
}

export async function SecuritySolutionServerlessHeadlessTestRunner(context: FtrProviderContext) {
  return SecuritySolutionCypressTestRunner(context, 'cypress:run');
}
