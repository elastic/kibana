/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// main panels links
export const DASHBOARDS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:dashboards"]';
export const DASHBOARDS_PANEL_BTN =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:dashboards"]';

export const INVESTIGATIONS =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:investigations"]';
export const INVESTIGATIONS_PANEL_BTN =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:investigations"]';

export const EXPLORE = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:explore"]';
export const EXPLORE_PANEL_BTN =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:explore"]';

export const RULES_PANEL_BTN =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:rules-landing"]';

export const ASSETS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:assets"]';
export const ASSETS_PANEL_BTN = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:assets"]';

export const MACHINE_LEARNING =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:machine_learning-landing"]';
export const MACHINE_LEARNING_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:machine_learning-landing"]';

// main direct links
export const DISCOVER = '[data-test-subj*="nav-item-deepLinkId-discover"]';

export const ALERTS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:alerts"]';

export const CSP_FINDINGS =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:cloud_security_posture-findings"]';

export const THREAT_INTELLIGENCE =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:threat_intelligence"]';

export const CASES = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:cases"]';

// nested panel links
export const OVERVIEW = '[data-test-subj~="panelNavItem-id-overview"]';

export const DETECTION_RESPONSE = '[data-test-subj~="panelNavItem-id-detection_response"]';

export const ENTITY_ANALYTICS = '[data-test-subj~="panelNavItem-id-entity_analytics"]';

export const TIMELINES = '[data-test-subj~="panelNavItem-id-timelines"]';
export const OSQUERY = '[data-test-subj~="panelNavItem-id-osquery:"]';

export const KUBERNETES = '[data-test-subj~="panelNavItem-id-kubernetes"]';

export const CSP_DASHBOARD = '[data-test-subj~="panelNavItem-id-cloud_security_posture-dashboard"]';

export const HOSTS = '[data-test-subj~="panelNavItem-id-hosts"]';

export const ENDPOINTS = '[data-test-subj="panelNavItem-id-endpoints"]';
export const CLOUD_DEFEND = '[data-test-subj="panelNavItem-id-cloud_defend"]';

export const POLICIES = '[data-test-subj~="panelNavItem-id-policy"]';

export const TRUSTED_APPS = '[data-test-subj~="panelNavItem-id-trusted_apps"]';

export const EVENT_FILTERS = '[data-test-subj~="panelNavItem-id-event_filters"]';

export const BLOCKLIST = '[data-test-subj~="panelNavItem-id-blocklist"]';

export const CSP_BENCHMARKS =
  '[data-test-subj~="panelNavItem-id-cloud_security_posture-benchmarks"]';

export const RULES_COVERAGE = '[data-test-subj~="panelNavItem-id-coverage-overview"]';

export const NETWORK = '[data-test-subj~="panelNavItem-id-network"]';

export const USERS = '[data-test-subj~="panelNavItem-id-users"]';

export const RULES = '[data-test-subj~="panelNavItem-id-rules"]';

export const EXCEPTIONS = '[data-test-subj~="panelNavItem-id-exceptions"]';

export const getBreadcrumb = (deepLinkId: string) => {
  return `breadcrumb-deepLinkId-${deepLinkId}`;
};
// opens the navigation panel for a given nested link
export const openNavigationPanelFor = (pageName: string) => {
  let panel;
  switch (pageName) {
    case OVERVIEW:
    case DETECTION_RESPONSE:
    case KUBERNETES:
    case ENTITY_ANALYTICS:
    case CSP_DASHBOARD: {
      panel = DASHBOARDS_PANEL_BTN;
      break;
    }
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
    case ENDPOINTS:
    case CLOUD_DEFEND: {
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
