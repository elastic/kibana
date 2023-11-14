/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// main panels links
export const DASHBOARDS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:dashboards"]';
export const DASHBOARDS_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:dashboards"]';

export const INVESTIGATIONS =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:investigations"]';
export const INVESTIGATIONS_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:investigations"]';

export const EXPLORE = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:explore"]';
export const EXPLORE_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:explore"]';

export const RULES_LANDING =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:rules-landing"]';
export const RULES_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:rules-landing"]';

export const ASSETS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:assets"]';
export const ASSETS_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:assets"]';

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
export const OVERVIEW = '[data-test-subj="solutionSideNavPanelLink-overview"]';

export const DETECTION_RESPONSE = '[data-test-subj="solutionSideNavPanelLink-detection_response"]';

export const ENTITY_ANALYTICS = '[data-test-subj="solutionSideNavPanelLink-entity_analytics"]';

export const TIMELINES = '[data-test-subj="solutionSideNavPanelLink-timelines"]';
export const OSQUERY = '[data-test-subj="solutionSideNavPanelLink-osquery:"]';

export const KUBERNETES = '[data-test-subj="solutionSideNavPanelLink-kubernetes"]';

export const CSP_DASHBOARD =
  '[data-test-subj="solutionSideNavPanelLink-cloud_security_posture-dashboard"]';

export const HOSTS = '[data-test-subj="solutionSideNavPanelLink-hosts"]';

export const FLEET = '[data-test-subj="solutionSideNavPanelLink-fleet:"]';
export const ENDPOINTS = '[data-test-subj="solutionSideNavPanelLink-endpoints"]';
export const CLOUD_DEFEND = '[data-test-subj="solutionSideNavPanelLink-cloud_defend"]';

export const POLICIES = '[data-test-subj="solutionSideNavPanelLink-policy"]';

export const TRUSTED_APPS = '[data-test-subj="solutionSideNavPanelLink-trusted_apps"]';

export const EVENT_FILTERS = '[data-test-subj="solutionSideNavPanelLink-event_filters"]';

export const BLOCKLIST = '[data-test-subj="solutionSideNavPanelLink-blocklist"]';

export const CSP_BENCHMARKS =
  '[data-test-subj="solutionSideNavPanelLink-cloud_security_posture-benchmarks"]';

export const RULES_COVERAGE = '[data-test-subj="solutionSideNavPanelLink-coverage-overview"]';

export const NETWORK = '[data-test-subj="solutionSideNavPanelLink-network"]';

export const USERS = '[data-test-subj="solutionSideNavPanelLink-users"]';

export const RULES = '[data-test-subj="solutionSideNavPanelLink-rules"]';

export const EXCEPTIONS = '[data-test-subj="solutionSideNavPanelLink-exceptions"]';

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
    case FLEET:
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
