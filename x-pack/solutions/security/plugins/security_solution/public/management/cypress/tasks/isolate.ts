/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable cypress/no-unnecessary-waiting */

import { API_VERSIONS } from '@kbn/fleet-plugin/common';
import { openAlertDetailsView } from '../screens/alerts';
import type { ActionDetails } from '../../../../common/endpoint/types';
import { loadPage } from './common';
import { waitForActionToSucceed } from './response_actions';
import { goToAlertsTab } from './alerts';

const API_ENDPOINT_ACTION_PATH = '/api/endpoint/action/*';
export const interceptActionRequests = (
  cb: (responseBody: ActionDetails) => void,
  alias: string
): void => {
  cy.intercept('POST', API_ENDPOINT_ACTION_PATH, (req) => {
    req.continue((res) => {
      const {
        body: { action, data },
      } = res;

      cb({ action, ...data });
    });
  }).as(alias);
};

export const sendActionResponse = (action: ActionDetails): void => {
  cy.task('sendHostActionResponse', {
    action,
    state: { state: 'success' },
  });
};

export const isolateHostWithComment = (comment: string, hostname: string): void => {
  cy.getByTestSubj('isolate-host-action-item').click();
  cy.contains(`Isolate host ${hostname} from network.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
};

export const releaseHostWithComment = (comment: string, hostname: string): void => {
  cy.contains(`${hostname} is currently isolated.`);
  cy.getByTestSubj('endpointHostIsolationForm');
  cy.getByTestSubj('host_isolation_comment').type(comment);
};

export const openCaseAlertDetails = (alertId: string): void => {
  cy.getByTestSubj(`comment-action-show-alert-${alertId}`).click();
  cy.getByTestSubj('securitySolutionFlyoutFooterDropdownButton').click();
};

export const waitForReleaseOption = (alertId: string): void => {
  openCaseAlertDetails(alertId);
  cy.getByTestSubj('event-field-agent.status').then(($status) => {
    if ($status.find('[title="Isolated"]').length > 0) {
      cy.contains('Release host').click();
    } else {
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      openCaseAlertDetails(alertId);
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.contains('Isolated');
      });
      cy.contains('Release host').click();
    }
  });
};

export const visitRuleAlerts = (ruleName: string) => {
  loadPage('/app/security/rules');
  cy.contains(ruleName).click();
  goToAlertsTab();
};

export const checkFlyoutEndpointIsolation = (): void => {
  cy.getByTestSubj('event-field-agent.status').then(($status) => {
    if ($status.find('[title="Isolated"]').length > 0) {
      cy.contains('Release host').click();
    } else {
      cy.getByTestSubj('euiFlyoutCloseButton').click();
      cy.wait(5000);
      openAlertDetailsView();
      cy.getByTestSubj('event-field-agent.status').within(() => {
        cy.contains('Isolated');
      });
      cy.contains('Release host').click();
    }
  });
};

export const toggleRuleOffAndOn = (ruleName: string): void => {
  loadPage('/app/security/rules');
  cy.wait(2000);
  cy.contains(ruleName)
    .parents('tr')
    .within(() => {
      cy.getByTestSubj('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      cy.getByTestSubj('ruleSwitch').click();
      cy.getByTestSubj('ruleSwitch').should('have.attr', 'aria-checked', 'false');
      cy.getByTestSubj('ruleSwitch').click();
      cy.getByTestSubj('ruleSwitch').should('have.attr', 'aria-checked', 'true');
    });
};

export const filterOutEndpoints = (endpointHostname: string): void => {
  cy.getByTestSubj('filters-global-container').within(() => {
    cy.getByTestSubj('queryInput').click();
    cy.getByTestSubj('queryInput').type(`host.name: ${endpointHostname}`);
    cy.getByTestSubj('querySubmitButton').click();
  });
};

export const filterOutIsolatedHosts = (): void => {
  cy.getByTestSubj('adminSearchBar').type('united.endpoint.Endpoint.state.isolation: true');
  cy.getByTestSubj('querySubmitButton').click();
};

const checkEndpointListForIsolationStatus = (expectIsolated: boolean): void => {
  const chainer = expectIsolated ? 'contain' : 'not.contain';
  cy.getByTestSubj('endpointListTable').within(() => {
    cy.get('tbody tr')
      .eq(0)
      .within(() => {
        cy.get('td', { timeout: 120000 }).eq(1).should(chainer, 'Isolated');
      });
  });
};

export const checkEndpointListForOnlyUnIsolatedHosts = (): void =>
  checkEndpointListForIsolationStatus(false);
export const checkEndpointListForOnlyIsolatedHosts = (): void =>
  checkEndpointListForIsolationStatus(true);

export const isolateHostActionViaAPI = (agentId: string): void => {
  cy.request({
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    method: 'POST',
    url: 'api/endpoint/action/isolate',
    body: {
      endpoint_ids: [agentId],
    },
  })
    // verify action was successful
    .then((response) => waitForActionToSucceed(response.body.data.id))
    .then((actionResponse) => {
      expect(actionResponse.status).to.equal('successful');
    });
};

export const checkEndpointIsolationStatus = (
  endpointHostname: string,
  expectIsolated: boolean
): void => {
  const chainer = expectIsolated ? 'contain' : 'not.contain';
  cy.contains(endpointHostname).parents('td').siblings('td').eq(0).should(chainer, 'Isolated');
};

export const checkEndpointIsIsolated = (endpointHostname: string): void =>
  checkEndpointIsolationStatus(endpointHostname, true);

export const checkEndpointIsNotIsolated = (endpointHostname: string): void =>
  checkEndpointIsolationStatus(endpointHostname, false);
