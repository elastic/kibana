/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import Url from 'url';

import { withProcRunner } from '@kbn/dev-utils';

import { FtrProviderContext } from './ftr_provider_context';

export async function SiemCypressTestRunner({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const esArchiver = getService('esArchiver');

  await esArchiver.load('empty_kibana');
  await esArchiver.load('auditbeat');

  await withProcRunner(log, async procs => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:run'],
      cwd: resolve(__dirname, '../../legacy/plugins/siem'),
      env: {
        FORCE_COLOR: '1',
        CYPRESS_baseUrl: Url.format(config.get('servers.kibana')),
        CYPRESS_ELASTICSEARCH_USERNAME: config.get('servers.elasticsearch.username'),
        CYPRESS_ELASTICSEARCH_PASSWORD: config.get('servers.elasticsearch.password'),
        ...process.env,
      },
      wait: true,
    });
  });
}
