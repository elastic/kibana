/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyData } from '../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import {
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { checkEndpointListForOnlyUnIsolatedHosts } from '../../tasks/isolate';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';

// Failing: https://github.com/elastic/kibana/issues/209063
// Failing: See https://github.com/elastic/kibana/issues/209063
// FLAKY: https://github.com/elastic/kibana/issues/209064
describe.skip('Document signing:', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  let indexedPolicy: IndexedFleetEndpointPolicyResponse;
  let policy: PolicyData;
  let createdHost: CreateAndEnrollEndpointHostResponse;

  before(() => {
    getEndpointIntegrationVersion().then((version) =>
      createAgentPolicyTask(version).then((data) => {
        indexedPolicy = data;
        policy = indexedPolicy.integrationPolicies[0];

        return enableAllPolicyProtections(policy.id).then(() => {
          // Create and enroll a new Endpoint host
          return createEndpointHost(policy.policy_ids[0]).then((host) => {
            createdHost = host as CreateAndEnrollEndpointHostResponse;
          });
        });
      })
    );
  });

  after(() => {
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

  beforeEach(() => {
    login();
  });

  it('should fail if data tampered', () => {
    waitForEndpointListPageToBeLoaded(createdHost.hostname);
    checkEndpointListForOnlyUnIsolatedHosts();
    openResponseConsoleFromEndpointList();
    performCommandInputChecks('isolate');

    // stop host so that we ensure tamper happens before endpoint processes the action
    cy.task('stopEndpointHost', createdHost.hostname);
    // get action doc before we submit command, so we know when the new action doc is indexed
    cy.task('getLatestActionDoc').then((previousActionDoc) => {
      submitCommand();
      cy.task('tamperActionDoc', previousActionDoc);
    });
    cy.task('startEndpointHost', createdHost.hostname);

    const actionValidationErrorMsg =
      'Fleet action response error: Failed to validate action signature; check Endpoint logs for details';
    // wait for 3 minutes for the response to be indexed
    cy.contains(actionValidationErrorMsg, { timeout: 180000 }).should('exist');
  });
});
