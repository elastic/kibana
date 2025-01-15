/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixedOutputLogger } from '../../../../scripts/endpoint/common/utils';
import type { RuntimeServices } from '../../../../scripts/endpoint/common/stack_services';
import { createRuntimeServices } from '../../../../scripts/endpoint/common/stack_services';

const RUNTIME_SERVICES_CACHE = new WeakMap<Cypress.PluginConfigOptions['env'], RuntimeServices>();

export const setupStackServicesUsingCypressConfig = async (
  configEnv: Cypress.PluginConfigOptions['env'],
  logPrefix: string = 'cy.dfw'
) => {
  if (RUNTIME_SERVICES_CACHE.has(configEnv)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return RUNTIME_SERVICES_CACHE.get(configEnv)!;
  }

  const isServerless = configEnv.IS_SERVERLESS;
  const isCloudServerless = configEnv.CLOUD_SERVERLESS;

  const stackServices = await createRuntimeServices({
    kibanaUrl: configEnv.KIBANA_URL,
    elasticsearchUrl: configEnv.ELASTICSEARCH_URL,
    fleetServerUrl: configEnv.FLEET_SERVER_URL,
    username: configEnv.KIBANA_USERNAME,
    password: configEnv.KIBANA_PASSWORD,
    esUsername: configEnv.ELASTICSEARCH_USERNAME,
    esPassword: configEnv.ELASTICSEARCH_PASSWORD,
    asSuperuser: !isCloudServerless,
    useCertForSsl: !isCloudServerless && isServerless,
  }).then(({ log, ...others }) => {
    return {
      ...others,
      log: prefixedOutputLogger(logPrefix, log),
    };
  });

  RUNTIME_SERVICES_CACHE.set(configEnv, stackServices);

  return stackServices;
};
