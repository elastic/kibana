/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefixedOutputLogger } from '@kbn/security-solution-plugin/scripts/endpoint/common/utils';
import { createToolingLogger } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/utils';
import { setupStackServicesUsingCypressConfig } from '@kbn/security-solution-plugin/public/management/cypress/support/common';
import { maybeCreateDockerNetwork, verifyDockerInstalled } from '@kbn/es';
import { AgentManager } from './agent';
import { createAgentPolicy } from './utils';

export async function beforeSpec(config: Cypress.PluginConfigOptions) {
  const log = prefixedOutputLogger('cy.parallel(svl).beforeSpec', createToolingLogger());
  const stackServicesPromise = setupStackServicesUsingCypressConfig({ env: config });
  const { kbnClient } = await stackServicesPromise;

  await verifyDockerInstalled(log);
  await maybeCreateDockerNetwork(log);
  const policyEnrollmentKey = await createAgentPolicy(kbnClient, log, 'Default policy');
  const policyEnrollmentKeyTwo = await createAgentPolicy(kbnClient, log, 'Osquery policy');

  await new AgentManager(policyEnrollmentKey, '0000', log, kbnClient).setup();
  await new AgentManager(policyEnrollmentKeyTwo, '0000', log, kbnClient).setup();
}
