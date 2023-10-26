/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// main panels links
export const DASHBOARDS = '[data-test-subj$="nav-item-deepLinkId-securitySolutionUI:dashboards"]';
export const DASHBOARDS_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:dashboards"]';

export const INVESTIGATIONS =
  '[data-test-subj$="nav-item-deepLinkId-securitySolutionUI:investigations"]';
export const INVESTIGATIONS_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:investigations"]';

export const EXPLORE = '[data-test-subj$="nav-item-deepLinkId-securitySolutionUI:explore"]';
export const EXPLORE_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:explore"]';

export const RULES_LANDING =
  '[data-test-subj$="nav-item-deepLinkId-securitySolutionUI:rules-landing"]';
export const RULES_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:rules-landing"]';

export const ASSETS = '[data-test-subj$="nav-item-deepLinkId-securitySolutionUI:assets"]';
export const ASSETS_PANEL_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-securitySolutionUI:assets"]';

// main direct links
export const DISCOVER = '[data-test-subj*="nav-item-deepLinkId-discover"]';

export const ALERTS = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:alerts"]';

export const CSP_FINDINGS =
  '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:cloud_security_posture-findings"]';

export const CASES = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:cases"]';

// nested links

export const OVERVIEW = '[data-test-subj="solutionSideNavPanelLink-overview"]';

export const DETECTION_RESPONSE = '[data-test-subj="solutionSideNavPanelLink-detection_response"]';

export const ENTITY_ANALYTICS = '[data-test-subj="solutionSideNavPanelLink-entity_analytics"]';

export const TIMELINES = '[data-test-subj="solutionSideNavPanelLink-timelines"]';

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
      panel = ASSETS_PANEL_BTN;
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
