/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsClient,
  KbnClient,
  KibanaUrl,
  ScoutPage,
  SecurityPageObjects,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  CUSTOM_QUERY_RULE,
  type CustomQueryRule,
} from '@kbn/scout-security/src/playwright/constants/detection_rules';
import {
  test,
  CPS_TAGS,
  SPACE_PROJECT_ROUTING_ALL,
  SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
} from '../../../fixtures';

/**
 * Validates CPS `projectRouting` propagation from the Kibana space into the Graph
 * Investigation API request body.
 *
 * The unit-test side asserts that the server forwards `project_routing` to a
 * single events ES|QL query covering both logs and alerts, and that the schema
 * accepts the documented routing modes. This UI test validates the piece the
 * unit tests can't reach: that the Graph React component actually subscribes to
 * `cps.cpsManager.getProjectRouting$()` and forwards the current value into
 * `/internal/cloud_security_posture/graph`.
 *
 * Specific entity-node assertions (origin vs linked) are deliberately omitted — the
 * events query filters by `event.id IN (originEventIds)`, which makes DOM-level
 * routing assertions noisy. The request-body assertion is the stable contract.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless \
 *     --domain security_complete --serverConfigSet cps_local --preserveEsData
 */

const GRAPH_API_PATH = '/internal/cloud_security_posture/graph';
// Kibana enforces a 1-minute minimum interval for detection rules.
const RULE_INTERVAL = '1m';
// First rule execution lands at ~RULE_INTERVAL after creation; budget extra slack.
const ALERT_WAIT_TIMEOUT = 180_000;
const ALERT_POLL_INTERVAL = 5_000;
// Entity store install + transition to `running` typically completes inside 60s.
const ENTITY_STORE_WAIT_TIMEOUT = 120_000;
const ENTITY_STORE_POLL_INTERVAL = 3_000;

interface GraphRequestBody {
  query: { projectRouting?: string };
}

const createSpaceScopedRule = async (params: {
  kbnClient: KbnClient;
  spaceId: string;
  rule: CustomQueryRule;
}): Promise<void> => {
  const { kbnClient, spaceId, rule } = params;
  await kbnClient.request({
    method: 'POST',
    path: `/s/${spaceId}/api/detection_engine/rules`,
    body: { ...rule, interval: RULE_INTERVAL },
    retries: 0,
  });
};

/**
 * The flyout's "Graph view" button is gated by `isEntityStoreAvailable`
 * (see `flyout/document_details/left/tabs/visualize_tab.tsx`). In a fresh cps_local
 * environment the entity store is `not_installed`, so we install + wait for the
 * engines to reach `running` before opening the flyout.
 *
 * The install endpoint is gated by the `securitySolution:entityStoreEnableV2`
 * UI setting, which the cps_local Scout config pre-enables via
 * `--uiSettings.overrides.securitySolution:entityStoreEnableV2=true`.
 */
const installEntityStoreInSpace = async (params: {
  kbnClient: KbnClient;
  spaceId: string;
}): Promise<void> => {
  const { kbnClient, spaceId } = params;

  await kbnClient.request({
    method: 'POST',
    path: `/s/${spaceId}/api/security/entity_store/install`,
    headers: { 'elastic-api-version': '2023-10-31' },
    body: { entityTypes: ['host', 'user'] },
    retries: 0,
  });

  await expect
    .poll(
      async () => {
        const { data } = await kbnClient.request<{ status?: string }>({
          method: 'GET',
          path: `/s/${spaceId}/api/security/entity_store/status`,
          headers: { 'elastic-api-version': '2023-10-31' },
        });
        return data?.status;
      },
      {
        message: `Entity store did not reach 'running' in space "${spaceId}" within ${ENTITY_STORE_WAIT_TIMEOUT}ms`,
        timeout: ENTITY_STORE_WAIT_TIMEOUT,
        intervals: [ENTITY_STORE_POLL_INTERVAL],
      }
    )
    .toBe('running');
};

const waitForAtLeastOneAlert = async (params: {
  esClient: EsClient;
  spaceId: string;
}): Promise<void> => {
  const { esClient, spaceId } = params;
  await expect
    .poll(
      async () => {
        const result = await esClient.count({
          index: `.alerts-security.alerts-${spaceId}`,
          // `ignore_unavailable` so the count is 0 (not an error) before the index exists.
          ignore_unavailable: true,
        });
        return result.count;
      },
      {
        message: `Detection rule did not produce any alerts in space "${spaceId}" within ${ALERT_WAIT_TIMEOUT}ms`,
        timeout: ALERT_WAIT_TIMEOUT,
        intervals: [ALERT_POLL_INTERVAL],
      }
    )
    .toBeGreaterThan(0);
};

const openAnyAlertGraphFlyout = async (params: {
  page: ScoutPage;
  kbnUrl: KibanaUrl;
  spaceId: string;
  ruleName: string;
  pageObjects: SecurityPageObjects;
}): Promise<void> => {
  const { page, kbnUrl, spaceId, ruleName, pageObjects } = params;
  // `alertsTablePage.navigate()` hard-codes the default space; we need the test's
  // CPS-configured space, so navigate directly with the space-scoped URL.
  await page.goto(kbnUrl.app('security/alerts', { space: spaceId }));
  await pageObjects.alertsTablePage.waitForDetectionsAlertsWrapper();
  await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
  await pageObjects.graphFlyoutPage.openGraphTab();
};

const setupSpaceWithFiringRule = async (params: {
  kbnClient: KbnClient;
  esClient: EsClient;
  cpsSpace: { create: (p: { spaceId: string; projectRouting: string }) => Promise<string> };
  runId: string;
  projectRouting: string;
  spaceIdPrefix: string;
}): Promise<{ spaceId: string; ruleName: string }> => {
  const { kbnClient, esClient, cpsSpace, runId, projectRouting, spaceIdPrefix } = params;
  const spaceId = await cpsSpace.create({
    spaceId: `${spaceIdPrefix}-${runId}`,
    projectRouting,
  });
  // Install entity store in parallel with rule creation — installation is
  // independent of the rule firing and overlapping the waits keeps the test
  // under the per-test timeout budget.
  const [, ruleName] = await Promise.all([
    installEntityStoreInSpace({ kbnClient, spaceId }),
    (async () => {
      const name = `${CUSTOM_QUERY_RULE.name}_${spaceIdPrefix}_${runId}`;
      await createSpaceScopedRule({
        kbnClient,
        spaceId,
        rule: {
          ...CUSTOM_QUERY_RULE,
          name,
          rule_id: `${spaceIdPrefix}-rule-${runId}`,
        },
      });
      await waitForAtLeastOneAlert({ esClient, spaceId });
      return name;
    })(),
  ]);
  return { spaceId, ruleName };
};

test.describe('Graph Visualization CPS projectRouting', { tag: CPS_TAGS }, () => {
  // Each test waits ~1 min for the detection rule's first execution + UI flow.
  // The Playwright default (60s) isn't enough; budget generously.
  test.setTimeout(360_000);

  test('search-all space forwards projectRouting=_alias:* to the Graph API', async ({
    page,
    cpsSpace,
    graphCpsTestData,
    esClient,
    kbnClient,
    kbnUrl,
    browserAuth,
    pageObjects,
  }) => {
    const { spaceId, ruleName } = await setupSpaceWithFiringRule({
      kbnClient,
      esClient,
      cpsSpace,
      runId: graphCpsTestData.runId,
      projectRouting: SPACE_PROJECT_ROUTING_ALL,
      spaceIdPrefix: 'cps-graph-all',
    });

    await browserAuth.loginAsPlatformEngineer();

    // Set up the listener BEFORE clicking through the flyout so we don't miss
    // the request fired on Graph mount.
    const graphRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes(GRAPH_API_PATH) &&
        request.url().includes(`/s/${spaceId}/`) &&
        request.method() === 'POST',
      { timeout: 60_000 }
    );

    await openAnyAlertGraphFlyout({ page, kbnUrl, spaceId, ruleName, pageObjects });

    const graphRequest = await graphRequestPromise;
    const body = graphRequest.postDataJSON() as GraphRequestBody;
    expect(body.query.projectRouting).toBe(SPACE_PROJECT_ROUTING_ALL);

    await pageObjects.graphFlyoutPage.waitForGraphReady();
  });

  test('origin-only space forwards projectRouting=_alias:_origin to the Graph API', async ({
    page,
    cpsSpace,
    graphCpsTestData,
    esClient,
    kbnClient,
    kbnUrl,
    browserAuth,
    pageObjects,
  }) => {
    const { spaceId, ruleName } = await setupSpaceWithFiringRule({
      kbnClient,
      esClient,
      cpsSpace,
      runId: graphCpsTestData.runId,
      projectRouting: SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
      spaceIdPrefix: 'cps-graph-orig',
    });

    await browserAuth.loginAsPlatformEngineer();

    const graphRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes(GRAPH_API_PATH) &&
        request.url().includes(`/s/${spaceId}/`) &&
        request.method() === 'POST',
      { timeout: 60_000 }
    );

    await openAnyAlertGraphFlyout({ page, kbnUrl, spaceId, ruleName, pageObjects });

    const graphRequest = await graphRequestPromise;
    const body = graphRequest.postDataJSON() as GraphRequestBody;
    expect(body.query.projectRouting).toBe(SPACE_PROJECT_ROUTING_ORIGIN_ONLY);

    await pageObjects.graphFlyoutPage.waitForGraphReady();
  });
});
