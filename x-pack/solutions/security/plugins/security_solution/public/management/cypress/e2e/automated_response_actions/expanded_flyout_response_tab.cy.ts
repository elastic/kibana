/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForEndpointListPageToBeLoaded } from '../../tasks/response_console';
import { getWithResponseActionsRole } from '../../../../../scripts/endpoint/common/roles_users';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { login } from '../../tasks/login';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { closeAllToasts } from '../../tasks/toasts';
import { toggleRuleOffAndOn, visitRuleAlerts } from '../../tasks/isolate';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { waitForAlertsToPopulate } from '../../tasks/alerts';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../../scripts/endpoint/common/endpoint_host_services';
import { createEndpointHost } from '../../tasks/create_endpoint_host';
import { deleteAllLoadedEndpointData } from '../../tasks/delete_all_endpoint_data';
import { enableAllPolicyProtections } from '../../tasks/endpoint_policy';

const loginWithoutResponseActionsHistory = () => {
  const roleWithoutArtifactPrivilege = getRoleWithoutResponseActionsHistory();
  login.withCustomRole({ name: 'roleWithoutArtifactPrivilege', ...roleWithoutArtifactPrivilege });
};

const getRoleWithoutResponseActionsHistory = () => {
  const endpointSecurityNoResponseActions = getWithResponseActionsRole();

  const siemVersion =
    Object.keys(endpointSecurityNoResponseActions.kibana[0].feature).find((feature) =>
      feature.startsWith('siem')
    ) ?? SECURITY_FEATURE_ID;

  return {
    ...endpointSecurityNoResponseActions,
    kibana: [
      {
        ...endpointSecurityNoResponseActions.kibana[0],
        feature: {
          ...endpointSecurityNoResponseActions.kibana[0].feature,
          [siemVersion]: endpointSecurityNoResponseActions.kibana[0].feature[siemVersion].filter(
            (privilege) => !privilege.match(/(actions_log_management)\w+/)
          ),
        },
      },
    ],
  };
};

describe(
  'Automated Response Actions',
  {
    // skipped in serverless for now since custom roles are not yet supported, and this test relies on a custom role
    tags: ['@ess', '@skipInServerless'],
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    let policy: PolicyData;
    let createdHost: CreateAndEnrollEndpointHostResponse;
    let ruleId: string;
    let ruleName: string;

    before(() => {
      getEndpointIntegrationVersion()
        .then((version) =>
          createAgentPolicyTask(version, 'automated_response_actions').then((data) => {
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
          loadRule({
            query: `agent.id: "${createdHost.agentId}"`,
          }).then((data) => {
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

    beforeEach(() => {
      loginWithoutResponseActionsHistory();
    });

    it('should not show the response when no action history privilege', () => {
      waitForEndpointListPageToBeLoaded(createdHost.hostname);
      toggleRuleOffAndOn(ruleName);

      visitRuleAlerts(ruleName);
      closeAllToasts();
      waitForAlertsToPopulate(1, 2000, 120000);

      cy.getByTestSubj('expand-event').first().click();
      cy.getByTestSubj('securitySolutionFlyoutNavigationExpandDetailButton').click();
      cy.getByTestSubj('securitySolutionFlyoutResponseTab').click();
      cy.getByTestSubj('responseActionsViewWrapper');
      cy.contains('Permission denied');
    });
  }
);
