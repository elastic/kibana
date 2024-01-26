/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export const RULES_LANDING = '[data-test-subj="solutionSideNavPanelLink-rules-landing"]';
export const RULES_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-rules-landing"]';

export const SETTINGS = '[data-test-subj="solutionSideNavItemLink-administration"]';
export const SETTINGS_PANEL_BTN = '[data-test-subj="solutionSideNavItemButton-administration"]';

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

export const EVENT_FILTERS = '[data-test-subj="solutionSideNavPanelLink-event_filters"]';

export const BLOCKLIST = '[data-test-subj="solutionSideNavPanelLink-blocklist"]';

export const CSP_BENCHMARKS =
  '[data-test-subj="solutionSideNavPanelLink-cloud_security_posture-benchmarks"]';

export const NETWORK = '[data-test-subj="solutionSideNavPanelLink-network"]';

export const USERS = '[data-test-subj="solutionSideNavPanelLink-users"]';

export const INDICATORS = '[data-test-subj="solutionSideNavItemLink-threat_intelligence"]';

export const RULES = '[data-test-subj="solutionSideNavPanelLink-rules"]';

export const EXCEPTIONS = '[data-test-subj="solutionSideNavPanelLink-exceptions"]';

// other
export const BREADCRUMBS = '[data-test-subj="breadcrumbs"] a';

export const KQL_INPUT = `${GLOBAL_KQL_WRAPPER} [data-test-subj="queryInput"]`;

export const REFRESH_BUTTON = `${GLOBAL_KQL_WRAPPER} [data-test-subj="querySubmitButton"]`;

export const LOADING_INDICATOR = '[data-test-subj="globalLoadingIndicator"]';
export const LOADING_INDICATOR_HIDDEN = '[data-test-subj="globalLoadingIndicator-hidden"]';

export const KIBANA_LOADING_ICON = '[data-test-subj="kbnLoadingMessage"]';

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
    case EVENT_FILTERS:
    case POLICIES:
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
