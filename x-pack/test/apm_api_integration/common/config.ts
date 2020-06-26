/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { FtrProviderContext } from 'test/functional/ftr_provider_context';
import supertestAsPromised from 'supertest-as-promised';
import { format } from 'url';
import { APM_READ_USER, APM_TEST_PASSWORD } from './authentication';

interface Settings {
  license: 'basic' | 'trial';
  testFiles: string[];
  name: string;
}

export function createTestConfig(settings: Settings) {
  const { testFiles, license, name } = settings;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services');
    const servers = xPackAPITestsConfig.get('servers');

    servers.kibana = {
      ...servers.kibana,
    };

    return {
      testFiles,
      servers,
      services: {
        ...services,
        supertest: async (context: FtrProviderContext) => {
          const security = context.getService('security');

          await security.init();

          await security.user.create(APM_READ_USER.name, {
            password: APM_TEST_PASSWORD,
            full_name: APM_READ_USER.name,
            roles: APM_READ_USER.roles,
          });

          const url = format({
            ...servers.kibana,
            auth: `${APM_READ_USER.name}:${APM_TEST_PASSWORD}`,
            username: APM_READ_USER.name,
            password: APM_TEST_PASSWORD,
          });

          return supertestAsPromised(url);
        },
      },
      junit: {
        reportName: name,
      },
      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        license,
      },
      kbnTestServer: xPackAPITestsConfig.get('kbnTestServer'),
    };
  };
}
