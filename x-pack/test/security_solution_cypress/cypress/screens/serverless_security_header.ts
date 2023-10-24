/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Test subjects in serverless navigation have the following structure:
 * "sideNavItemLink-security_project_nav.node-1-2.investigations"
 * The "node-1-2" part is dynamic and changes with the number of nodes in the tree.
 * To solve this, we use the "starts with" selector [data-test-subj^="sideNavItemLink-security_project_nav"]
 * and then we add the static end part of the selector for each link.
 */

const NAVIGATION_BASE = '[data-test-subj^="sideNavItemLink-security_project_nav"]';
const PANEL_BUTTON_BASE = '[data-test-subj^="panelOpener-security_project_nav"]';

// main links
export const DASHBOARDS = `${NAVIGATION_BASE}[data-test-subj$="dashboards"]`;
export const DASHBOARDS_PANEL_BTN = `${PANEL_BUTTON_BASE}[data-test-subj$="dashboards"]`;

export const ALERTS = `${NAVIGATION_BASE}[data-test-subj$="alerts"]`;

export const CSP_FINDINGS = `${NAVIGATION_BASE}[data-test-subj$="cloud_security_posture-findings"]`;

export const CASES = `${NAVIGATION_BASE}[data-test-subj$="cases"]`;

export const INVESTIGATIONS = `${NAVIGATION_BASE}[data-test-subj$="investigations"]`;

export const EXPLORE = `${NAVIGATION_BASE}[data-test-subj$="explore"]`;
export const EXPLORE_PANEL_BTN = `${PANEL_BUTTON_BASE}[data-test-subj$="explore"]`;

export const RULES_LANDING = `${NAVIGATION_BASE}[data-test-subj$="rules-landing"]`;
export const RULES_PANEL_BTN = `${PANEL_BUTTON_BASE}[data-test-subj$="rules-landing"]`;

export const ASSETS = `${NAVIGATION_BASE}[data-test-subj$="assets"]`;
export const ASSETS_PANEL_BTN = `${PANEL_BUTTON_BASE}[data-test-subj$="assets"]`;

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
