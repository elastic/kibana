/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelectorMatch } from '../helpers/common';

export const MORE_MENU_BTN = getDataTestSubjectSelectorMatch('kbnChromeNav-moreMenuTrigger');

export const FOOTER_LAUNCHPAD = getDataTestSubjectSelectorMatch(
  'nav-item-id-securityGroup:launchpad'
);

// main panels links
export const INVESTIGATIONS_PANEL_BTN =
  '[data-test-subj*="nav-item-id-securityGroup:investigations"]';
export const EXPLORE_PANEL_BTN = '[data-test-subj*="nav-item-id-securityGroup:explore"]';
export const RULES_PANEL_BTN = '[data-test-subj*="nav-item-id-securityGroup:rules"]';
export const ASSETS_PANEL_BTN = '[data-test-subj*="nav-item-id-securityGroup:assets"]';

// main direct links
export const DISCOVER = '[data-test-subj*="nav-item-deepLinkId-discover"]';

export const DASHBOARDS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:dashboards"]';

export const ALERTS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:alerts"]';

export const CSP_FINDINGS =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:cloud_security_posture-findings"]';

export const THREAT_INTELLIGENCE =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:threat_intelligence"]';

export const CASES = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:cases"]';

// nested panel links
export const TIMELINES = '[data-test-subj~="nav-item-id-timelines"]';

export const OSQUERY = '[data-test-subj~="nav-item-id-osquery"]';

export const HOSTS = '[data-test-subj~="nav-item-id-hosts"]';

export const FLEET = '[data-test-subj~="nav-item-id-fleet"]';
export const ENDPOINTS = '[data-test-subj~="nav-item-id-endpoints"]';

export const POLICIES = '[data-test-subj~="nav-item-id-policy"]';

export const TRUSTED_APPS = '[data-test-subj~="nav-item-id-trusted_apps"]';

export const TRUSTED_DEVICES = '[data-test-subj~="nav-item-id-trusted_devices"]';

export const EVENT_FILTERS = '[data-test-subj~="nav-item-id-event_filters"]';

export const BLOCKLIST = '[data-test-subj~="nav-item-id-blocklist"]';

export const HOST_ISOLATION_EXCEPTIONS =
  '[data-test-subj~="nav-item-id-host_isolation_exceptions"]';

export const ENDPOINT_EXCEPTIONS = '[data-test-subj~="nav-item-id-endpoint_exceptions"]';

export const RESPONSE_ACTIONS_HISTORY = '[data-test-subj~="nav-item-id-response_actions_history"]';

export const CSP_BENCHMARKS = '[data-test-subj~="nav-item-id-cloud_security_posture-benchmarks"]';

export const RULES_COVERAGE = '[data-test-subj~="nav-item-id-coverage-overview"]';

export const NETWORK = '[data-test-subj~="nav-item-id-network"]';

export const USERS = '[data-test-subj~="nav-item-id-users"]';

export const RULES = '[data-test-subj~="nav-item-id-rules"]';

export const EXCEPTIONS = '[data-test-subj~="nav-item-id-exceptions"]';

export const ONBOARDING = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:get_started"]';

// Siem Migrations
export const TRANSLATED_RULES_PAGE = getDataTestSubjectSelectorMatch(
  'nav-item-id-siem_migrations-rules'
);

// opens the navigation panel for a given nested link
export const openNavigationPanelFor = (pageName: string) => {
  let panel;
  switch (pageName) {
    case RULES:
    case CSP_BENCHMARKS:
    case EXCEPTIONS:
    case RULES_COVERAGE: {
      panel = RULES_PANEL_BTN;
      break;
    }
    case TIMELINES:
    case OSQUERY: {
      panel = INVESTIGATIONS_PANEL_BTN;
      break;
    }
    case HOSTS:
    case NETWORK:
    case USERS: {
      panel = EXPLORE_PANEL_BTN;
      break;
    }
    case FLEET:
    case ENDPOINT_EXCEPTIONS:
    case ENDPOINTS: {
      panel = ASSETS_PANEL_BTN;
      break;
    }
  }
  if (panel) {
    openNavigationPanel(panel);
  }
};

// opens the navigation panel of a main link
export const openNavigationPanel = (pageName: string) => {
  cy.get(pageName).click();
};

export const showMoreItems = () => {
  // TODO: more menu item is flaky in security because of initial rendering and heigh measurement
  // so we really try to get a stable reference here before proceeding
  // https://github.com/elastic/kibana/issues/239331
  cy.get('[data-test-subj~="nav-item"]').should('exist');
  cy.get('[data-test-subj="globalLoadingIndicator-hidden"').should('exist');
  cy.get('[data-test-subj="globalLoadingIndicator"').should('not.exist');

  // TODO: https://github.com/elastic/kibana/issues/239331
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.wait(1000);
  cy.get(MORE_MENU_BTN).click();
  cy.get(MORE_MENU_BTN).should('have.attr', 'aria-expanded', 'true');
};
