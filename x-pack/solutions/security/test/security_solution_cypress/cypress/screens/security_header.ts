/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector, getDataTestSubjectSelectorMatch } from '../helpers/common';
import { GLOBAL_KQL_WRAPPER } from './search_bar';

// main links
export const DASHBOARDS = '[data-test-subj="solutionSideNavItemLink-dashboards"]';
export const DASHBOARDS_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-dashboards"]';

export const ALERTS = '[data-test-subj="solutionSideNavItemLink-alerts"]';

export const CSP_FINDINGS =
  '[data-test-subj="solutionSideNavItemLink-cloud_security_posture-findings"]';

export const CASES = '[data-test-subj="solutionSideNavItemLink-cases"]';

export const TIMELINES = '[data-test-subj="solutionSideNavItemLink-timelines"]';

export const EXPLORE = '[data-test-subj="solutionSideNavItemLink-explore"]';
export const EXPLORE_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-explore"]';

export const RULES_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-rules-landing"]';

export const SETTINGS = '[data-test-subj="solutionSideNavItemLink-administration"]';
export const SETTINGS_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-administration"]';

export const MIGRATIONS_LANDING = '[data-test-subj="solutionSideNavItemLink-siem_migrations"]';
export const MIGRATIONS_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-siem_migrations"]';

// nested links
export const OVERVIEW = '[data-test-subj="solutionSideNavPanelLink-overview"]';

export const DETECTION_RESPONSE = '[data-test-subj="solutionSideNavPanelLink-detection_response"]';

export const ENTITY_ANALYTICS = '[data-test-subj="solutionSideNavPanelLink-entity_analytics"]';

export const KUBERNETES = '[data-test-subj="solutionSideNavPanelLink-kubernetes"]';

export const CSP_DASHBOARD =
  '[data-test-subj="solutionSideNavPanelLink-cloud_security_posture-dashboard"]';

export const HOSTS = '[data-test-subj="solutionSideNavPanelLink-hosts"]';

export const ENDPOINTS = '[data-test-subj="solutionSideNavPanelLink-endpoints"]';

export const POLICIES = '[data-test-subj="solutionSideNavPanelLink-policy"]';

export const TRUSTED_APPS = '[data-test-subj="solutionSideNavPanelLink-trusted_apps"]';

export const TRUSTED_DEVICES = '[data-test-subj="solutionSideNavPanelLink-trusted_devices"]';

export const EVENT_FILTERS = '[data-test-subj="solutionSideNavPanelLink-event_filters"]';

export const BLOCKLIST = '[data-test-subj="solutionSideNavPanelLink-blocklist"]';

export const HOST_ISOLATION_EXCEPTIONS =
  '[data-test-subj="solutionSideNavPanelLink-host_isolation_exceptions"]';

export const ENDPOINT_EXCEPTIONS =
  '[data-test-subj="solutionSideNavPanelLink-endpoint_exceptions"]';

export const RESPONSE_ACTIONS_HISTORY =
  '[data-test-subj="solutionSideNavPanelLink-response_actions_history"]';

export const CSP_BENCHMARKS =
  '[data-test-subj="solutionSideNavPanelLink-cloud_security_posture-benchmarks"]';

export const NETWORK = '[data-test-subj="solutionSideNavPanelLink-network"]';

export const USERS = '[data-test-subj="solutionSideNavPanelLink-users"]';

export const INDICATORS = '[data-test-subj="solutionSideNavItemLink-threat_intelligence"]';

export const RULES = '[data-test-subj="solutionSideNavPanelLink-rules"]';

export const EXCEPTIONS = '[data-test-subj="solutionSideNavPanelLink-exceptions"]';

// other
export const BREADCRUMBS = '[data-test-subj="breadcrumbs"] a';

export const KQL_INPUT_TEXT_AREA = '[data-test-subj="queryInput"]';

export const KQL_INPUT = (dataTestSubj: string = KQL_INPUT_TEXT_AREA) =>
  `${GLOBAL_KQL_WRAPPER} ${dataTestSubj}`;

export const REFRESH_BUTTON = `[data-test-subj="kbnQueryBar"] [data-test-subj="querySubmitButton"]`;

export const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';

export const KIBANA_LOADING_ICON = '[data-test-subj="kbnLoadingMessage"]';

// Siem Migrations
export const TRANSLATED_RULES_PAGE = Cypress.env('IS_SERVERLESS')
  ? getDataTestSubjectSelectorMatch('nav-item-id-siem_migrations-rules')
  : getDataTestSubjectSelector('solutionSideNavPanelLink-siem_migrations-rules');

export const TRANSLATED_DASHBOARDS_PAGE = getDataTestSubjectSelector(
  'solutionSideNavPanelLink-siem_migrations-dashboards'
);

// opens the navigation panel for a given nested link
export const openNavigationPanelFor = (page: string) => {
  let panel;
  switch (page) {
    case OVERVIEW:
    case DETECTION_RESPONSE:
    case KUBERNETES:
    case ENTITY_ANALYTICS:
    case CSP_DASHBOARD: {
      panel = DASHBOARDS_PANEL_BTN;
      break;
    }
    case HOSTS:
    case NETWORK:
    case USERS: {
      panel = EXPLORE_PANEL_BTN;
      break;
    }
    case RULES:
    case EXCEPTIONS:
    case CSP_BENCHMARKS: {
      panel = RULES_PANEL_BTN;
      break;
    }
    case ENDPOINTS:
    case TRUSTED_APPS:
    case TRUSTED_DEVICES:
    case EVENT_FILTERS:
    case POLICIES:
    case ENDPOINT_EXCEPTIONS:
    case BLOCKLIST: {
      panel = SETTINGS_PANEL_BTN;
      break;
    }
  }
  if (panel) {
    openNavigationPanel(panel);
  }
};

// opens the navigation panel of a main link
export const openNavigationPanel = (page: string) => {
  cy.get(page).click();
};
