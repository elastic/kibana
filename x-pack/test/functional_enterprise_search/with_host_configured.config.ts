/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { resolve } from 'path';
import { FtrConfigProviderContext, defineDockerServersConfig } from '@kbn/test';
import { runEnterpriseSearchTests } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const baseConfig = await readConfigFile(require.resolve('./cypress.config'));

  // TODO get latest automatcially
  const dockerImage = `docker.elastic.co/enterprise-search/enterprise-search:8.6.0-SNAPSHOT`;

  // TODO move config
  const dockerArgs: string[] = [
    `run`,
    `-p`,
    `9220:9220`,
    `-v`,
    `${resolve(
      __dirname,
      '../../../../ent-search/config/config.local.yml'
    )}:/usr/share/enterprise-search/config/enterprise-search.yml`,
    `--add-host`,
    `host.docker.internal:host-gateway`,
    `--rm`,
    `--name`,
    `enterprise-search-ftr`,
    dockerImage,
  ];

  return {
    ...kibanaCommonTestsConfig.getAll(),
    // default to the xpack functional config
    ...baseConfig.getAll(),

    // testFiles: [resolve(__dirname, './apps/enterprise_search/with_host_configured')],

    junit: {
      reportName: 'X-Pack Enterprise Search Functional Tests with Host Configured',
    },
    // dockerServers: defineDockerServersConfig({
    //   registry: {
    //     enabled: true,
    //     image: dockerImage,
    //     portInContainer: 3002,
    //     port: 3002,
    //     args: dockerArgs,
    //     waitForLogLine: 'Jetty successfully started and is ready to handle requests!',
    //     waitForLogLineTimeoutMs: 60 * 2 * 10000, // 2 minutes
    //   },
    // }),

    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--enterpriseSearch.host=http://localhost:3002',
      ],
    },
    testRunner: (context: GenericFtrProviderContext<{}, {}>) => {
      return runEnterpriseSearchTests(context, 'run');
    },
  };
}
