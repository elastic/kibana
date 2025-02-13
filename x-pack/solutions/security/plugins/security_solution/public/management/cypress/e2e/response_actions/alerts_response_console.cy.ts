/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeAllToasts } from '../../tasks/toasts';
import {
  getAlertsTableRows,
  openAlertDetailsView,
  openAlertDetailsViewFromTimeline,
  openInvestigateInTimelineView,
  openResponderFromEndpointAlertDetails,
} from '../../screens/alerts';
import { ensureOnResponder } from '../../screens/responder';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import type { PolicyData } from '../../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';

import { login } from '../../tasks/login';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';

describe(
  'Response console: From Alerts',
  { tags: ['@ess', '@serverless', '@brokenInServerless'] },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    let policy: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;

    let ruleId: string;
    let ruleName: string;
    beforeEach(() => {
      login();
    });

    before(() => {
      getEndpointIntegrationVersion()
        .then((version) =>
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
        )
        .then(() => {
          loadRule(
            { query: `agent.name: ${createdHost.hostname} and agent.type: endpoint` },
            false
          ).then((data) => {
            ruleId = data.id;
            ruleName = data.name;
          });
        });
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

      if (ruleId) {
        cleanupRule(ruleId);
      }
    });

    afterEach(function () {
      if (Cypress.env('IS_CI') && this.currentTest?.isFailed() && createdHost) {
        cy.task('captureHostVmAgentDiagnostics', {
          hostname: createdHost.hostname,
          fileNamePrefix: this.currentTest?.fullTitle(),
        });
      }
    });

    it('should open responder from alert details flyout', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      toggleRuleOffAndOn(ruleName);
      visitRuleAlerts(ruleName);
      closeAllToasts();
      getAlertsTableRows().should('have.length.greaterThan', 0);
      openAlertDetailsView();

      openResponderFromEndpointAlertDetails();
      ensureOnResponder();
    });

    it('should open responder from timeline view alert details flyout', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      toggleRuleOffAndOn(ruleName);
      visitRuleAlerts(ruleName);
      closeAllToasts();

      getAlertsTableRows().should('have.length.greaterThan', 0);
      openInvestigateInTimelineView();
      openAlertDetailsViewFromTimeline();
      openResponderFromEndpointAlertDetails();
      ensureOnResponder();
    });
  }
);
