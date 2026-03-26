/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllLoadedEndpointData } from '../tasks/delete_all_endpoint_data';
import { getAlertsTableRows, navigateToAlertsList } from '../screens/alerts';
import { waitForEndpointAlerts } from '../tasks/alerts';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../tasks/fleet';
import { createEndpointHost } from '../tasks/create_endpoint_host';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { enableAllPolicyProtections } from '../tasks/endpoint_policy';
import type { PolicyData } from '../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../scripts/endpoint/common/endpoint_host_services';
import { login, ROLE } from '../tasks/login';

// Failing: See https://github.com/elastic/kibana/issues/207529
// Failing: See https://github.com/elastic/kibana/issues/207529
// Failing: See https://github.com/elastic/kibana/issues/207529
// Failing: See https://github.com/elastic/kibana/issues/207529
describe.skip('Endpoint generated alerts', { tags: ['@ess', '@serverless'] }, () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let createdHost: CreateAndEnrollEndpointHostResponse;

  beforeEach(() => {
    login(ROLE.soc_manager);
    getEndpointIntegrationVersion().then((version) => {
      return createAgentPolicyTask(version, 'alerts test').then((data) => {
        indexedPolicy = data;
        policy = indexedPolicy.integrationPolicies[0];

        return enableAllPolicyProtections(policy.id).then(() => {
          // Create and enroll a new Endpoint host
          return createEndpointHost(policy.policy_ids[0]).then((host) => {
            createdHost = host as CreateAndEnrollEndpointHostResponse;
          });
        });
      });
    });
  });

  afterEach(() => {
    if (createdHost) {
      cy.task('destroyEndpointHost', createdHost);
    }

    if (indexedPolicy) {
      cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
    }

    if (createdHost) {
      deleteAllLoadedEndpointData({ endpointAgentIds: [createdHost.agentId] });
    }
  });

  it('should create a Detection Engine alert from an endpoint alert', () => {
    const executeMaliciousCommand = `bash -c cat /dev/tcp/foo`;

    // Execute shell command that trigger Endpoint to send alert to Kibana
    cy.task('executeCommandOnHost', {
      hostname: createdHost.hostname,
      command: executeMaliciousCommand,
    })
      .then((execResponse) => {
        cy.log(
          `Command [${executeMaliciousCommand}] was executed on host VM [${
            createdHost.hostname
          }]: ${JSON.stringify(execResponse)}`
        );

        return waitForEndpointAlerts(createdHost.agentId, undefined, 240000);
      })
      .then(() => {
        return navigateToAlertsList(
          `query=(language:kuery,query:'agent.id: "${createdHost.agentId}" ')`
        );
      });

    getAlertsTableRows().should('have.length.greaterThan', 0);
  });
});
