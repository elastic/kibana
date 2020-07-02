/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import supertestAsPromised from 'supertest-as-promised';
import { format, UrlObject } from 'url';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import { PromiseReturnType } from '../../../plugins/apm/typings/common';
import { createApmUser, APM_TEST_PASSWORD, ApmUser } from './authentication';

interface Settings {
  license: 'basic' | 'trial';
  testFiles: string[];
  name: string;
}

const supertestAsApmUser = (kibanaServer: UrlObject, apmUser: ApmUser) => async (
  context: InheritedFtrProviderContext
) => {
  const security = context.getService('security');
  await security.init();

  await createApmUser(security, apmUser);

  const url = format({
    ...kibanaServer,
    auth: `${apmUser}:${APM_TEST_PASSWORD}`,
  });

  return supertestAsPromised(url);
};

export function createTestConfig(settings: Settings) {
  const { testFiles, license, name } = settings;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services') as InheritedServices;
    const servers = xPackAPITestsConfig.get('servers');

    const supertestAsApmReadUser = supertestAsApmUser(servers.kibana, ApmUser.apmReadUser);

    return {
      testFiles,
      servers,
      services: {
        ...services,
        supertest: supertestAsApmReadUser,
        supertestAsApmReadUser,
        supertestAsApmWriteUser: supertestAsApmUser(servers.kibana, ApmUser.apmWriteUser),
        supertestAsApmAnnotationsWriteUser: supertestAsApmUser(
          servers.kibana,
          ApmUser.apmAnnotationsWriteUser
        ),
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

export type ApmServices = PromiseReturnType<ReturnType<typeof createTestConfig>>['services'];
