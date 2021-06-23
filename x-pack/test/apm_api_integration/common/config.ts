/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import { PromiseReturnType } from '../../../plugins/observability/typings/common';
import { createApmUser, APM_TEST_PASSWORD, ApmUser } from './authentication';
import { APMFtrConfigName } from '../configs';
import { registry } from './registry';

interface Config {
  name: APMFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, string>;
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

  return supertest(url);
};

export function createTestConfig(config: Config) {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services') as InheritedServices;
    const servers = xPackAPITestsConfig.get('servers');

    const supertestAsApmReadUser = supertestAsApmUser(servers.kibana, ApmUser.apmReadUser);

    registry.init(config.name);

    return {
      testFiles: [require.resolve('../tests')],
      servers,
      services: {
        ...services,
        supertest: supertestAsApmReadUser,
        supertestAsApmReadUser,
        supertestAsNoAccessUser: supertestAsApmUser(servers.kibana, ApmUser.noAccessUser),
        supertestAsApmWriteUser: supertestAsApmUser(servers.kibana, ApmUser.apmWriteUser),
        supertestAsApmAnnotationsWriteUser: supertestAsApmUser(
          servers.kibana,
          ApmUser.apmAnnotationsWriteUser
        ),
        supertestAsApmReadUserWithoutMlAccess: supertestAsApmUser(
          servers.kibana,
          ApmUser.apmReadUserWithoutMlAccess
        ),
      },
      junit: {
        reportName: `APM API Integration tests (${name})`,
      },
      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        license,
      },
      kbnTestServer: {
        ...xPackAPITestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
          ...(kibanaConfig
            ? Object.entries(kibanaConfig).map(([key, value]) => `--${key}=${value}`)
            : []),
        ],
      },
    };
  };
}

export type ApmServices = PromiseReturnType<ReturnType<typeof createTestConfig>>['services'];
