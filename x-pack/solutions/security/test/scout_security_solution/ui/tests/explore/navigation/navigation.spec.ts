/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  ALERTS_URL,
  CASES_URL,
  RULES_MANAGEMENT_URL,
  RULES_COVERAGE_OVERVIEW_URL,
  DASHBOARDS_URL,
  NETWORK_URL,
  HOSTS_URL,
  USERS_URL,
  INDICATORS_URL,
  TIMELINES_URL,
  EXPLORE_URL,
  MANAGE_URL,
  EXCEPTIONS_URL,
  ENDPOINTS_URL,
  TRUSTED_APPS_URL,
  EVENT_FILTERS_URL,
  BLOCKLIST_URL,
  CSP_BENCHMARKS_URL,
  CSP_FINDINGS_URL,
  POLICIES_URL,
  DETECTION_AND_RESPONSE_URL,
  ENTITY_ANALYTICS_URL,
  CSP_DASHBOARD_URL,
  DISCOVER_URL,
  OSQUERY_URL,
} from '../../../common/urls';
import { EXPLORE_URLS } from '../../../fixtures/page_objects';

const KIBANA_HOME = '/app/home#/';

test.describe(
  'top-level navigation common to all pages in the Security app',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(TIMELINES_URL);
    });

    test('navigates to the Dashboards landing page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-dashboards');
      await expect(page).toHaveURL(new RegExp(DASHBOARDS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Overview page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-overview');
      await expect(page).toHaveURL(new RegExp(EXPLORE_URLS.OVERVIEW.replace(/\//g, '\\/')));
    });

    test('navigates to the Detection & Response page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-detection_response');
      await expect(page).toHaveURL(new RegExp(DETECTION_AND_RESPONSE_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Entity Analytics page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-entity_analytics');
      await expect(page).toHaveURL(new RegExp(ENTITY_ANALYTICS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the CSP dashboard page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo(
        'solutionSideNavPanelLink-cloud_security_posture'
      );
      await expect(page).toHaveURL(new RegExp(CSP_DASHBOARD_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Alerts page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-alerts');
      await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Findings page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-findings');
      await expect(page).toHaveURL(new RegExp(CSP_FINDINGS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Timelines page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-timelines');
      await expect(page).toHaveURL(new RegExp(TIMELINES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Explore landing page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavItemButton-explore');
      await expect(page).toHaveURL(new RegExp(EXPLORE_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Hosts page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-hosts');
      await expect(page).toHaveURL(new RegExp(HOSTS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Network page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-network');
      await expect(page).toHaveURL(new RegExp(NETWORK_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Users page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-users');
      await expect(page).toHaveURL(new RegExp(USERS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Indicators page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo(
        'solutionSideNavPanelLink-threat_intelligence'
      );
      await expect(page).toHaveURL(new RegExp(INDICATORS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Rules page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-rules');
      await expect(page).toHaveURL(new RegExp(RULES_MANAGEMENT_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Exceptions page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-exceptions');
      await expect(page).toHaveURL(new RegExp(EXCEPTIONS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Cases page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-cases');
      await expect(page).toHaveURL(new RegExp(CASES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Manage landing page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-manage');
      await expect(page).toHaveURL(new RegExp(MANAGE_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Endpoints page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-endpoints');
      await expect(page).toHaveURL(new RegExp(ENDPOINTS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Policies page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-policy');
      await expect(page).toHaveURL(new RegExp(POLICIES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Trusted Apps page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-trusted_apps');
      await expect(page).toHaveURL(new RegExp(TRUSTED_APPS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Event Filters page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-event_filters');
      await expect(page).toHaveURL(new RegExp(EVENT_FILTERS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Blocklist page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-blocklist');
      await expect(page).toHaveURL(new RegExp(BLOCKLIST_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the CSP Benchmarks page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-csp_benchmarks');
      await expect(page).toHaveURL(new RegExp(CSP_BENCHMARKS_URL.replace(/\//g, '\\/')));
    });
  }
);

test.describe(
  'Kibana navigation to all pages in the Security app',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoUrl(KIBANA_HOME);
      await pageObjects.explore.openKibanaNavigation();
    });

    test('navigates to the Dashboards page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Dashboards');
      await expect(page).toHaveURL(new RegExp(DASHBOARDS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Alerts page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Alerts');
      await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Findings page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Findings');
      await expect(page).toHaveURL(new RegExp(CSP_FINDINGS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Timelines page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Timelines');
      await expect(page).toHaveURL(new RegExp(TIMELINES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Cases page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Cases');
      await expect(page).toHaveURL(new RegExp(CASES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Explore page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Explore');
      await expect(page).toHaveURL(new RegExp(EXPLORE_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Threat Intelligence page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Intelligence');
      await expect(page).toHaveURL(new RegExp(INDICATORS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Manage page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromKibanaCollapsibleTo('Manage');
      await expect(page).toHaveURL(new RegExp(MANAGE_URL.replace(/\//g, '\\/')));
    });
  }
);

test.describe(
  'Serverless side navigation links',
  { tag: [...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoUrl('/app/security/get_started');
    });

    test('navigates to the Discover page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-discover');
      await expect(page).toHaveURL(new RegExp(DISCOVER_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Dashboards landing page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-dashboards');
      await expect(page).toHaveURL(new RegExp(DASHBOARDS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Rules page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-rules');
      await expect(page).toHaveURL(new RegExp(RULES_MANAGEMENT_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the CSP Benchmarks page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-csp_benchmarks');
      await expect(page).toHaveURL(new RegExp(CSP_BENCHMARKS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Exceptions page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-exceptions');
      await expect(page).toHaveURL(new RegExp(EXCEPTIONS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Rules coverage page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-rules_coverage');
      await expect(page).toHaveURL(new RegExp(RULES_COVERAGE_OVERVIEW_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Alerts page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-alerts');
      await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Findings page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-findings');
      await expect(page).toHaveURL(new RegExp(CSP_FINDINGS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Cases page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-cases');
      await expect(page).toHaveURL(new RegExp(CASES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Timelines page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-timelines');
      await expect(page).toHaveURL(new RegExp(TIMELINES_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Osquery page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-osquery');
      await expect(page).toHaveURL(new RegExp(OSQUERY_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Indicators page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo(
        'solutionSideNavPanelLink-threat_intelligence'
      );
      await expect(page).toHaveURL(new RegExp(INDICATORS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Hosts page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-hosts');
      await expect(page).toHaveURL(new RegExp(HOSTS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Network page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-network');
      await expect(page).toHaveURL(new RegExp(NETWORK_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Users page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-users');
      await expect(page).toHaveURL(new RegExp(USERS_URL.replace(/\//g, '\\/')));
    });

    test('navigates to the Endpoints page', async ({ pageObjects, page }) => {
      await pageObjects.explore.navigateFromHeaderTo('solutionSideNavPanelLink-endpoints');
      await expect(page).toHaveURL(new RegExp(ENDPOINTS_URL.replace(/\//g, '\\/')));
    });
  }
);
