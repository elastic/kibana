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
  ARTIFACTS,
  NETWORK,
  TIMELINES,
  EXCEPTIONS,
  USERS,
  DASHBOARDS,
  INDICATORS,
  CSP_BENCHMARKS,
  CSP_FINDINGS,
  POLICIES,
  EXPLORE,
  SETTINGS,
  SOLUTION_SIDE_NAV_PANEL,
  RULES_NAV_LINK,
  LAUNCHPAD_PANEL_BTN,
  GET_STARTED_TEST_SUBJ,
  SIEM_READINESS_TEST_SUBJ,
  VALUE_REPORTS_TEST_SUBJ,
  MANAGE_AUTOMATIC_MIGRATIONS_TEST_SUBJ,
  LAUNCHPAD_TRANSLATED_RULES_PAGE,
  TRANSLATED_DASHBOARDS_PAGE,
} from '../../../screens/security_header';
import * as ServerlessHeaders from '../../../screens/serverless_security_header';

import { login } from '../../../tasks/login';
import { visit, visitGetStartedPage, visitWithTimeRange } from '../../../tasks/navigation';
import {
  verifyNavigatesFromDashboardLandingTo,
  navigateFromHeaderTo,
} from '../../../tasks/security_header';

import {
  ALERTS_URL,
  CASES_URL,
  KIBANA_HOME,
  ENDPOINTS_URL,
  ADMINISTRATION_URL_PREFIX,
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
  BLOCKLIST_URL,
  CSP_BENCHMARKS_URL,
  CSP_FINDINGS_URL,
  POLICIES_URL,
  ENTITY_ANALYTICS_URL,
  INDICATORS_URL,
  DISCOVER_URL,
  RULES_COVERAGE_URL,
  OSQUERY_URL,
  HOSTS_URL,
  ENDPOINT_EXCEPTIONS_URL,
  HOST_ISOLATION_EXCEPTIONS_URL,
  TRUSTED_DEVICES_URL,
  CLOUD_NATIVE_VULN_MGMT_URL,
  DATA_QUALITY_URL,
  KUBERNETES_URL,
  GET_STARTED_URL,
  SIEM_READINESS_URL,
  VALUE_REPORTS_URL,
  MANAGE_AUTOMATIC_MIGRATIONS_URL,
  TRANSLATED_RULES_PAGE_URL,
  TRANSLATED_DASHBOARDS_PAGE_URL,
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
  LAUNCHPAD_PAGE,
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

  it('navigates to the Overview page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo('overview', OVERVIEW_URL);
  });

  it('navigates to the Detection & Response page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo('detection_response', DETECTION_AND_RESPONSE_URL);
  });

  it('navigates to Kubernetes page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo('kubernetes', KUBERNETES_URL);
  });

  it('navigates to the CSP page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo('cloud_security_posture-dashboard', CSP_DASHBOARD_URL);
  });

  it('navigates to the Cloud Native Vulnerability Management page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo(
      'cloud_security_posture-vulnerability_dashboard',
      CLOUD_NATIVE_VULN_MGMT_URL
    );
  });

  it('navigates to the Entity Analytics page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo('entity_analytics', ENTITY_ANALYTICS_URL);
    cy.url().should('include', ENTITY_ANALYTICS_URL);
  });

  it('navigates to Data quality page from dashboard', () => {
    cy.visit(DASHBOARDS_URL);
    verifyNavigatesFromDashboardLandingTo('data_quality', DATA_QUALITY_URL);
    cy.url().should('include', DATA_QUALITY_URL);
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

  it('opens the Explore sub nav panel', () => {
    navigateFromHeaderTo(EXPLORE);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Hosts');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Network');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Users');
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

  it('opens the Rules sub nav panel', () => {
    navigateFromHeaderTo(RULES_NAV_LINK);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Detection rules (SIEM)');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Benchmarks');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Shared exception lists');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'MITRE ATT&CK® Coverage');
  });

  it('navigates to the Exceptions page', () => {
    navigateFromHeaderTo(EXCEPTIONS);
    cy.url().should('include', EXCEPTIONS_URL);
  });

  it('navigates to the Cases page', () => {
    navigateFromHeaderTo(CASES);
    cy.url().should('include', CASES_URL);
  });

  it('opens Launchpad sub nav panel', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Get started');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'SIEM Readiness');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Value report');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Manage Automatic Migrations');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Translated rules');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Translated dashboards');
  });

  it('navigates to the Get Started page from Launchpad', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(GET_STARTED_TEST_SUBJ).click();
    cy.url().should('include', GET_STARTED_URL);
  });

  it('navigates to SIEM Readiness page from Launchpad', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(SIEM_READINESS_TEST_SUBJ).click();
    cy.url().should('include', SIEM_READINESS_URL);
  });

  it('navigates to the Value Report page from Launchpad', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(VALUE_REPORTS_TEST_SUBJ).click();
    cy.url().should('include', VALUE_REPORTS_URL);
  });

  it('navigates to the Manage Automatic Migrations page from Launchpad', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(MANAGE_AUTOMATIC_MIGRATIONS_TEST_SUBJ).click();
    cy.url().should('include', MANAGE_AUTOMATIC_MIGRATIONS_URL);
  });

  it('navigates to the Translated Rules page from Launchpad', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(LAUNCHPAD_TRANSLATED_RULES_PAGE).click();
    cy.url().should('include', TRANSLATED_RULES_PAGE_URL);
  });

  it('navigates to Translated Dashboards page from Launchpad', () => {
    navigateFromHeaderTo(LAUNCHPAD_PANEL_BTN);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(TRANSLATED_DASHBOARDS_PAGE).click();
    cy.url().should('include', TRANSLATED_DASHBOARDS_PAGE_URL);
  });

  it('opens the Manage sub nav panel', () => {
    navigateFromHeaderTo(SETTINGS);
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('be.visible');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Entity analytics');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Endpoints');
    cy.get(SOLUTION_SIDE_NAV_PANEL).should('contain.text', 'Investigations');
  });

  it('navigates to the Endpoints page', () => {
    navigateFromHeaderTo(ENDPOINTS);
    cy.url().should('include', ENDPOINTS_URL);
  });
  it('navigates to the Policies page', () => {
    navigateFromHeaderTo(POLICIES);
    cy.url().should('include', POLICIES_URL);
  });
  it('navigates to the Artifacts page from the Manage panel', () => {
    navigateFromHeaderTo(ARTIFACTS);
    cy.url().should('include', ADMINISTRATION_URL_PREFIX);
  });
  for (const [artifactName, artifactUrl] of [
    ['trusted apps', TRUSTED_APPS_URL],
    ['event filters', EVENT_FILTERS_URL],
    ['blocklist', BLOCKLIST_URL],
    ['endpoint exceptions', ENDPOINT_EXCEPTIONS_URL],
    ['host isolation exceptions', HOST_ISOLATION_EXCEPTIONS_URL],
    ['trusted devices', TRUSTED_DEVICES_URL],
  ]) {
    it(`${artifactName} deep links still resolve`, () => {
      visit(artifactUrl);
      cy.url().should('include', artifactUrl);
    });
  }
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

  it('navigates to Launchpad - Get started page', () => {
    navigateFromKibanaCollapsibleTo(LAUNCHPAD_PAGE);
    cy.url().should('include', GET_STARTED_URL);
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

  it('navigates to the Rules page', () => {
    navigateFromHeaderTo(ServerlessHeaders.RULES, true);
    cy.url().should('include', RULES_MANAGEMENT_URL);
  });

  it('navigates to the CSP Benchmarks page', () => {
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

  it('navigates to the Endpoints page', () => {
    navigateFromHeaderTo(ServerlessHeaders.ENDPOINTS, true);
    cy.url().should('include', ENDPOINTS_URL);
  });
});
