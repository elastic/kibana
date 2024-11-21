/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { services } from './services';
import { createStatefulTestConfig } from '../../api_integration/deployment_agnostic/default_configs/stateful.config.base';

export function createTestConfig({
  license = 'trial',
  testFiles,
}: {
  license: string;
  testFiles?: string[];
}) {
  return async (context: FtrConfigProviderContext) => {
    const { readConfigFile } = context;
    const config = {
      kibana: {
        api: await readConfigFile(path.resolve(REPO_ROOT, 'test/api_integration/config.js')),
        functional: await readConfigFile(
          require.resolve('@kbn/test-suites-src/functional/config.base')
        ),
      },
      xpack: {
        api: await readConfigFile(require.resolve('../../api_integration/config.ts')),
      },
    };

    const testConfig = await createStatefulTestConfig({
      services: {
        ...services,
        es: config.kibana.api.get('services.es'),
        esSupertestWithoutAuth: config.xpack.api.get('services.esSupertestWithoutAuth'),
        supertest: config.kibana.api.get('services.supertest'),
        supertestWithoutAuth: config.xpack.api.get('services.supertestWithoutAuth'),
        retry: config.xpack.api.get('services.retry'),
        esArchiver: config.kibana.functional.get('services.esArchiver'),
        kibanaServer: config.kibana.functional.get('services.kibanaServer'),
        spaces: config.xpack.api.get('services.spaces'),
        usageAPI: config.xpack.api.get('services.usageAPI'),
      },
      testFiles: testFiles ?? [require.resolve('./security_and_spaces/apis')],
      junit: {
        reportName: 'X-Pack Spaces API Integration Tests -- ',
      },
      // esServerArgs: [`xpack.license.self_generated.type=${license}`],
    })(context);

    return {
      ...testConfig,
      kbnTestServer: {
        ...testConfig.kbnTestServer,
        serverArgs: [
          ...testConfig.kbnTestServer.serverArgs,
          '--status.allowAnonymous=false',
          '--server.xsrf.disableProtection=true',
          // `--plugin-path=${path.resolve(__dirname, '../common/plugins/spaces_test_plugin')}`,
        ],
      },
    };
  };
}
