/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES,
  ALERTS,
  HOSTS,
  ENDPOINTS,
  TRUSTED_APPS,
  EVENT_FILTERS,
  NETWORK,
  OVERVIEW,
  TIMELINES,
  RULES,
  EXCEPTIONS,
  USERS,
  DETECTION_RESPONSE,
  DASHBOARDS,
  CSP_DASHBOARD,
  KUBERNETES,
  INDICATORS,
  BLOCKLIST,
  CSP_BENCHMARKS,
  CSP_FINDINGS,
  POLICIES,
  EXPLORE,
  SETTINGS,
  ENTITY_ANALYTICS,
} from '../../../screens/security_header';
import * as ServerlessHeaders from '../../../screens/serverless_security_header';

import { login } from '../../../tasks/login';
import { visit, visitGetStartedPage, visitWithTimeRange } from '../../../tasks/navigation';
import { navigateFromHeaderTo } from '../../../tasks/security_header';

import {
  ALERTS_URL,
  CASES_URL,
  KIBANA_HOME,
  ENDPOINTS_URL,
  TRUSTED_APPS_URL,
  EVENT_FILTERS_URL,
  NETWORK_URL,
  OVERVIEW_URL,
  TIMELINES_URL,
  EXCEPTIONS_URL,
  USERS_URL,
  DASHBOARDS_URL,
  DETECTION_AND_RESPONSE_URL,
  EXPLORE_URL,
  MANAGE_URL,
  CSP_DASHBOARD_URL,
  KUBERNETES_URL,
  BLOCKLIST_URL,
  CSP_BENCHMARKS_URL,
  CSP_FINDINGS_URL,
  POLICIES_URL,
  ENTITY_ANALYTICS_URL,
  INDICATORS_URL,
  DISCOVER_URL,
  RULES_LANDING_URL,
  RULES_COVERAGE_URL,
  INVESTIGATIONS_URL,
  OSQUERY_URL,
  MACHINE_LEARNING_LANDING_URL,
  ASSETS_URL,
  FLEET_URL,
  CLOUD_DEFEND_URL,
  HOSTS_URL,
} from '../../../urls/navigation';
import { RULES_MANAGEMENT_URL } from '../../../urls/rules_management';
import {
  openKibanaNavigation,
  navigateFromKibanaCollapsibleTo,
} from '../../../tasks/kibana_navigation';
import {
  CASES_PAGE,
  ALERTS_PAGE,
  EXPLORE_PAGE,
  MANAGE_PAGE,
  DASHBOARDS_PAGE,
  TIMELINES_PAGE,
  FINDINGS_PAGE,
  THREAT_INTELLIGENCE_PAGE,
} from '../../../screens/kibana_navigation';

describe('top-level navigation common to all pages in the Security app', { tags: '@ess' }, () => {
  beforeEach(() => {
    login();
    visitWithTimeRange(TIMELINES_URL);
  });

  it('navigates to the Dashboards landing page', () => {
    navigateFromHeaderTo(DASHBOARDS);
    cy.url().should('include', DASHBOARDS_URL);
  });

  it('navigates to the Overview page', () => {
    navigateFromHeaderTo(OVERVIEW);
    cy.url().should('include', OVERVIEW_URL);
  });

  it('navigates to the Detection & Response page', () => {
    navigateFromHeaderTo(DETECTION_RESPONSE);
    cy.url().should('include', DETECTION_AND_RESPONSE_URL);
  });

  it('navigates to the Entity Analytics page', () => {
    navigateFromHeaderTo(ENTITY_ANALYTICS);
    cy.url().should('include', ENTITY_ANALYTICS_URL);
  });

  it('navigates to the Kubernetes page', () => {
    navigateFromHeaderTo(KUBERNETES);
    cy.url().should('include', KUBERNETES_URL);
  });

  it('navigates to the CSP dashboard page', () => {
    navigateFromHeaderTo(CSP_DASHBOARD);
    cy.url().should('include', CSP_DASHBOARD_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromHeaderTo(ALERTS);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Findings page', () => {
    navigateFromHeaderTo(CSP_FINDINGS);
    cy.url().should('include', CSP_FINDINGS_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(TIMELINES);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Explore landing page', () => {
    navigateFromHeaderTo(EXPLORE);
    cy.url().should('include', EXPLORE_URL);
  });

  it('navigates to the Hosts page', () => {
    navigateFromHeaderTo(HOSTS);
    cy.url().should('include', HOSTS_URL);
  });

  it('navigates to the Network page', () => {
    navigateFromHeaderTo(NETWORK);
    cy.url().should('include', NETWORK_URL);
  });

  it('navigates to the Users page', () => {
    navigateFromHeaderTo(USERS);
    cy.url().should('include', USERS_URL);
  });

  it('navigates to the Indicators page', () => {
    navigateFromHeaderTo(INDICATORS);
    cy.url().should('include', INDICATORS_URL);
  });

  it('navigates to the Rules page', () => {
    navigateFromHeaderTo(RULES);
    cy.url().should('include', RULES_MANAGEMENT_URL);
  });

  it('navigates to the Exceptions page', () => {
    navigateFromHeaderTo(EXCEPTIONS);
    cy.url().should('include', EXCEPTIONS_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromHeaderTo(CASES);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Manage landing page', () => {
    navigateFromHeaderTo(SETTINGS);
    cy.url().should('include', MANAGE_URL);
  });

  it('navigates to the Endpoints page', () => {
    navigateFromHeaderTo(ENDPOINTS);
    cy.url().should('include', ENDPOINTS_URL);
  });
  it('navigates to the Policies page', () => {
    navigateFromHeaderTo(POLICIES);
    cy.url().should('include', POLICIES_URL);
  });
  it('navigates to the Trusted Apps page', () => {
    navigateFromHeaderTo(TRUSTED_APPS);
    cy.url().should('include', TRUSTED_APPS_URL);
  });
  it('navigates to the Event Filters page', () => {
    navigateFromHeaderTo(EVENT_FILTERS);
    cy.url().should('include', EVENT_FILTERS_URL);
  });
  it('navigates to the Blocklist page', () => {
    navigateFromHeaderTo(BLOCKLIST);
    cy.url().should('include', BLOCKLIST_URL);
  });
  it('navigates to the CSP Benchmarks page', () => {
    navigateFromHeaderTo(CSP_BENCHMARKS);
    cy.url().should('include', CSP_BENCHMARKS_URL);
  });
});

describe('Kibana navigation to all pages in the Security app ', { tags: '@ess' }, () => {
  beforeEach(() => {
    login();
    visit(KIBANA_HOME);
    openKibanaNavigation();
  });

  it('navigates to the Dashboards page', () => {
    navigateFromKibanaCollapsibleTo(DASHBOARDS_PAGE);
    cy.url().should('include', DASHBOARDS_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromKibanaCollapsibleTo(ALERTS_PAGE);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Findings page', () => {
    navigateFromKibanaCollapsibleTo(FINDINGS_PAGE);
    cy.url().should('include', CSP_FINDINGS_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromKibanaCollapsibleTo(TIMELINES_PAGE);
    cy.url().should('include', TIMELINES_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromKibanaCollapsibleTo(CASES_PAGE);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Explore page', () => {
    navigateFromKibanaCollapsibleTo(EXPLORE_PAGE);
    cy.url().should('include', EXPLORE_URL);
  });

  it('navigates to the Threat Intelligence page', () => {
    navigateFromKibanaCollapsibleTo(THREAT_INTELLIGENCE_PAGE);
    cy.url().should('include', INDICATORS_URL);
  });

  it('navigates to the Manage page', () => {
    navigateFromKibanaCollapsibleTo(MANAGE_PAGE);
    cy.url().should('include', MANAGE_URL);
  });
});

describe('Serverless side navigation links', { tags: '@serverless' }, () => {
  beforeEach(() => {
    login();
    visitGetStartedPage();
  });

  it('navigates to the Discover page', () => {
    navigateFromHeaderTo(ServerlessHeaders.DISCOVER, true);
    cy.url().should('include', DISCOVER_URL);
  });

  it('navigates to the Dashboards landing page', () => {
    navigateFromHeaderTo(ServerlessHeaders.DASHBOARDS, true);
    cy.url().should('include', DASHBOARDS_URL);
  });

  it('navigates to the Overview page', () => {
    navigateFromHeaderTo(ServerlessHeaders.OVERVIEW, true);
    cy.url().should('include', OVERVIEW_URL);
  });

  it('navigates to the Detection & Response page', () => {
    navigateFromHeaderTo(ServerlessHeaders.DETECTION_RESPONSE, true);
    cy.url().should('include', DETECTION_AND_RESPONSE_URL);
  });

  it('navigates to the Entity Analytics page', () => {
    navigateFromHeaderTo(ServerlessHeaders.ENTITY_ANALYTICS, true);
    cy.url().should('include', ENTITY_ANALYTICS_URL);
  });

  it('navigates to the Kubernetes page', () => {
    navigateFromHeaderTo(ServerlessHeaders.KUBERNETES, true);
    cy.url().should('include', KUBERNETES_URL);
  });

  it('navigates to the CSP dashboard page', () => {
    navigateFromHeaderTo(ServerlessHeaders.CSP_DASHBOARD, true);
    cy.url().should('include', CSP_DASHBOARD_URL);
  });

  it('navigates to the Rules landing page', () => {
    navigateFromHeaderTo(ServerlessHeaders.RULES_LANDING, true);
    cy.url().should('include', RULES_LANDING_URL);
  });
  it('navigates to the Rules page', () => {
    navigateFromHeaderTo(ServerlessHeaders.RULES, true);
    cy.url().should('include', RULES_MANAGEMENT_URL);
  });

  it('navigates to the Rules page', () => {
    navigateFromHeaderTo(ServerlessHeaders.CSP_BENCHMARKS, true);
    cy.url().should('include', CSP_BENCHMARKS_URL);
  });

  it('navigates to the Exceptions page', () => {
    navigateFromHeaderTo(ServerlessHeaders.EXCEPTIONS, true);
    cy.url().should('include', EXCEPTIONS_URL);
  });

  it('navigates to the Rules coverage page', () => {
    navigateFromHeaderTo(ServerlessHeaders.RULES_COVERAGE, true);
    cy.url().should('include', RULES_COVERAGE_URL);
  });

  it('navigates to the Alerts page', () => {
    navigateFromHeaderTo(ServerlessHeaders.ALERTS, true);
    cy.url().should('include', ALERTS_URL);
  });

  it('navigates to the Findings page', () => {
    navigateFromHeaderTo(ServerlessHeaders.CSP_FINDINGS, true);
    cy.url().should('include', CSP_FINDINGS_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromHeaderTo(ServerlessHeaders.CASES, true);
    cy.url().should('include', CASES_URL);
  });

  it('navigates to the Investigations page', () => {
    navigateFromHeaderTo(ServerlessHeaders.INVESTIGATIONS, true);
    cy.url().should('include', INVESTIGATIONS_URL);
  });

  it('navigates to the Timelines page', () => {
    navigateFromHeaderTo(ServerlessHeaders.TIMELINES, true);
    cy.url().should('include', TIMELINES_URL);
  });
  it('navigates to the Osquery page', () => {
    navigateFromHeaderTo(ServerlessHeaders.OSQUERY, true);
    cy.url().should('include', OSQUERY_URL);
  });

  it('navigates to the Indicators page', () => {
    navigateFromHeaderTo(ServerlessHeaders.THREAT_INTELLIGENCE, true);
    cy.url().should('include', INDICATORS_URL);
  });

  it('navigates to the Explore landing page', () => {
    navigateFromHeaderTo(ServerlessHeaders.EXPLORE, true);
    cy.url().should('include', EXPLORE_URL);
  });

  it('navigates to the Hosts page', () => {
    navigateFromHeaderTo(ServerlessHeaders.HOSTS, true);
    cy.url().should('include', HOSTS_URL);
  });

  it('navigates to the Network page', () => {
    navigateFromHeaderTo(ServerlessHeaders.NETWORK, true);
    cy.url().should('include', NETWORK_URL);
  });

  it('navigates to the Users page', () => {
    navigateFromHeaderTo(ServerlessHeaders.USERS, true);
    cy.url().should('include', USERS_URL);
  });

  it('navigates to the Assets page', () => {
    navigateFromHeaderTo(ServerlessHeaders.ASSETS, true);
    cy.url().should('include', ASSETS_URL);
  });
  it('navigates to the Endpoints page', () => {
    navigateFromHeaderTo(ServerlessHeaders.ENDPOINTS, true);
    cy.url().should('include', ENDPOINTS_URL);
  });
  it('navigates to the Fleet page', () => {
    navigateFromHeaderTo(ServerlessHeaders.FLEET, true);
    cy.url().should('include', FLEET_URL);
  });
  it('navigates to the Cloud defend page', () => {
    navigateFromHeaderTo(ServerlessHeaders.CLOUD_DEFEND, true);
    cy.url().should('include', CLOUD_DEFEND_URL);
  });
  it('navigates to the Machine learning landing page', () => {
    navigateFromHeaderTo(ServerlessHeaders.MACHINE_LEARNING, true);
    cy.url().should('include', MACHINE_LEARNING_LANDING_URL);
  });
});
