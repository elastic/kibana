/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

// main panels links
export const INVESTIGATIONS_PANEL_BTN =
  '[data-test-subj*="nav-item-id-securityGroup:investigations"]';
export const EXPLORE_PANEL_BTN = '[data-test-subj*="nav-item-id-securityGroup:explore"]';
export const RULES_PANEL_BTN = '[data-test-subj*="nav-item-id-securityGroup:rules"]';
export const ASSETS_PANEL_BTN = '[data-test-subj*="nav-item-id-securityGroup:assets"]';
export const MACHINE_LEARNING_BTN =
  '[data-test-subj*="panelOpener-deepLinkId-id-securityGroup:machineLearning"]';

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
export const TIMELINES = '[data-test-subj~="panelNavItem-id-timelines"]';

export const OSQUERY = '[data-test-subj~="panelNavItem-id-osquery"]';

export const HOSTS = '[data-test-subj~="panelNavItem-id-hosts"]';

export const FLEET = '[data-test-subj~="panelNavItem-id-fleet"]';
export const ENDPOINTS = '[data-test-subj~="panelNavItem-id-endpoints"]';

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

export const ONBOARDING = '[data-test-subj*="nav-item-deepLinkId-securitySolutionUI:get_started"]';

export const getBreadcrumb = (deepLinkId: string) => {
  return `breadcrumb-deepLinkId-${deepLinkId}`;
};

// Siem Migrations
export const TRANSLATED_RULES_PAGE = getDataTestSubjectSelector(
  'panelNavItem panelNavItem-id-siem_migrations-rules'
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
