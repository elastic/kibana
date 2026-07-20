/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  spaceTest,
  tags,
  HOST_FLYOUT_ENTITY_ID,
  HOST_FLYOUT_HOST_NAME,
  MOCK_ANOMALY_OVERVIEW_EMPTY,
  MOCK_ANOMALY_OVERVIEW_FILTERED_BY_CREDENTIAL_ACCESS,
  MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS,
  MOCK_ANOMALY_SUMMARY,
  MOCK_ANOMALY_SUMMARY_FILTERED_BY_CREDENTIAL_ACCESS,
  MOCK_ANOMALY_SUMMARY_MULTI_TACTIC,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const ANOMALY_OVERVIEW_ROUTE = `**/internal/entity_analytics/entities/host/${HOST_FLYOUT_ENTITY_ID}/anomaly_overview`;
const ANOMALY_SUMMARY_ROUTE = `**/internal/entity_analytics/entities/host/${HOST_FLYOUT_ENTITY_ID}/anomaly_summary`;
const ANOMALY_PRIVILEGES_ROUTE = '**/internal/entity_analytics/anomalies/privileges';

spaceTest.describe(
  'Entity flyout anomalies',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.installEntityStoreV2(['host']);
      await apiServices.entityAnalytics.indexEntityStoreEntry(
        HOST_FLYOUT_ENTITY_ID,
        HOST_FLYOUT_HOST_NAME
      );
    });

    spaceTest.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsPlatformEngineer();
      // The privileges check gates every anomalies fetch below and isn't itself under test here;
      // mock it so a transient real-backend hiccup can't make the anomalies section silently
      // never load (see the flakiness this caused when left to hit the real endpoint).
      await page.route(ANOMALY_PRIVILEGES_ROUTE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_all_required: true,
            privileges: { elasticsearch: {} },
          }),
        });
      });
      // The anomaly table calls useGetInstalledJob to look up ML job detector descriptions.
      // These EA security jobs are not installed in the test environment, so without this mock
      // the endpoint 404s, triggering a "Security job fetch failure" toast that covers
      // interactive elements and causes click timeouts.
      await page.route('**/internal/ml/jobs/jobs', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              job_id: 'auth_high_count_logon_events_ea',
              analysis_config: { detectors: [] },
              datafeed_config: { query: { match_all: {} }, indices: ['logs-*'] },
            },
            {
              job_id: 'rare_process_by_host_linux_ea',
              analysis_config: { detectors: [] },
              datafeed_config: { query: { match_all: {} }, indices: ['logs-*'] },
            },
          ]),
        });
      });
      // The entity risk contributions section (above the anomalies section in the right panel)
      // calls the security solution search strategy for risk scores. Without this mock the call
      // takes several seconds, keeping the section in a loading state that continuously shifts
      // the anomalies section's Y position — preventing Playwright's stability check from
      // passing before the test timeout.
      await page.route('**/internal/search/securitySolutionSearchStrategy', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            isRunning: false,
            isPartial: false,
            totalCount: 0,
            data: [],
            rawResponse: {
              took: 0,
              timed_out: false,
              _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
              hits: { total: { value: 0, relation: 'eq' }, hits: [] },
            },
          }),
        });
      });
      // The entity resolution group check triggers a second risk score search strategy call if
      // a group is found. Return 404 (the expected "no group" response) to prevent that.
      await page.route('**/api/security/entity_store/resolution/group**', async (route) => {
        await route.fulfill({ status: 404 });
      });
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.uninstallEntityStoreV2(['host']);
    });

    spaceTest(
      'host right panel shows anomalies section when the entity has anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesSection).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesExpandablePanel).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesRecentTable).toBeVisible();
      }
    );

    spaceTest(
      'host right panel shows anomalies section with an empty state when the entity has no anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_EMPTY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesSection).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesRecentTable).toContainText(
          'No anomalies detected within last 30 days'
        );
      }
    );

    spaceTest(
      'host entity details left panel shows anomalies tab and tab content when the entity has anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTab).toBeVisible();

        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabAttackChain).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTimeline).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTable).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).toBeVisible();
        await expect(
          pageObjects.entityFlyoutAnomaliesPage.anomaliesTabManageJobsButton
        ).toBeVisible();
      }
    );

    spaceTest(
      'host right panel shows an error state in the anomalies section when the anomaly overview API returns an error',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, (route) => route.fulfill({ status: 500 }));

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesSection).toBeVisible();
        // React Query retries failed requests 3 times with exponential backoff (~1s + 2s + 4s = ~7s)
        // before setting isError, so we need more than the default 10s assertion timeout.
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesExpandablePanel).toContainText(
          'Unable to load behavioral anomalies',
          { timeout: 15000 }
        );
      }
    );

    spaceTest(
      'host entity details left panel shows anomalies tab with an empty state when the entity has no anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_EMPTY),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              entity_id: HOST_FLYOUT_ENTITY_ID,
              entity_type: 'host',
              anomalies: [],
              total: 0,
              page: 1,
              page_size: 10,
            }),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTab).toBeVisible();

        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabAttackChain).toBeHidden();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).toContainText(
          'No anomalies detected'
        );
      }
    );

    spaceTest(
      'host entity details left panel anomalies tab shows table but not attack chain when entity has no tactic associations',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabAttackChain).toBeHidden();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTable).toBeVisible();
      }
    );

    spaceTest(
      'clicking the anomalies count link in the right panel opens the entity details left panel on the anomalies tab',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesCountLink();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTab).toBeVisible();
      }
    );

    spaceTest(
      'anomalies table row actions menu exposes investigation actions',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });
        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();
        await pageObjects.entityFlyoutAnomaliesPage.openRowActionsMenu();

        await expect(
          pageObjects.entityFlyoutAnomaliesPage.getRowAction('add-to-timeline')
        ).toBeVisible();
        await expect(
          pageObjects.entityFlyoutAnomaliesPage.getRowAction('view-in-discover')
        ).toBeVisible();
        await expect(
          pageObjects.entityFlyoutAnomaliesPage.getRowAction('view-in-single-metric-viewer')
        ).toBeVisible();
      }
    );

    spaceTest(
      'Add to timeline row action opens timeline scoped to the anomaly influencers',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });
        // Backs the row action's record lookup (ml.mlApi.results.anomalySearch) —
        // returns a raw ES search response since the server proxies it unmodified.
        await page.route('**/internal/ml/results/anomaly_search', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              hits: {
                hits: [
                  {
                    _source: {
                      timestamp: 1735689600000,
                      bucket_span: 900,
                      influencers: [
                        {
                          influencer_field_name: 'host.name',
                          influencer_field_values: [HOST_FLYOUT_HOST_NAME],
                        },
                      ],
                    },
                  },
                ],
              },
            }),
          });
        });
        // Backs both the row action's job lookup (ml.mlApi.jobs.jobs) and the table's
        // own detector-description lookup (useGetInstalledJob), which also hits this
        // endpoint and reads analysis_config.detectors — must be present or that lookup
        // throws and the table (and its row actions button) never renders. A match_all
        // datafeed query is a KNOWN_EMPTY_QUERY, so no extra datafeed filter is added to
        // the timeline.
        await page.route('**/internal/ml/jobs/jobs', async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                job_id: 'auth_high_count_logon_events_ea',
                analysis_config: { detectors: [] },
                datafeed_config: { query: { match_all: {} }, indices: ['logs-*'] },
              },
            ]),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();
        await pageObjects.entityFlyoutAnomaliesPage.openRowActionsMenu();
        await pageObjects.entityFlyoutAnomaliesPage.getRowAction('add-to-timeline').click();

        await expect(pageObjects.timelinePage.panel).toBeVisible({ timeout: 30000 });
        await expect(pageObjects.timelinePage.kqlTextarea).toHaveValue(/"host\.name":"test-host"/);
      }
    );

    spaceTest(
      'selecting and clearing a MITRE tactic on the Anomalies tab filters and restores anomaly results',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          const body = route.request().postDataJSON() as { threat_tactics?: string[] } | null;
          const isFiltered = body?.threat_tactics?.includes('Credential Access') ?? false;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              isFiltered
                ? MOCK_ANOMALY_OVERVIEW_FILTERED_BY_CREDENTIAL_ACCESS
                : MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES
            ),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          const body = route.request().postDataJSON() as { threat_tactics?: string[] } | null;
          const isFiltered = body?.threat_tactics?.includes('Credential Access') ?? false;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(
              isFiltered
                ? MOCK_ANOMALY_SUMMARY_FILTERED_BY_CREDENTIAL_ACCESS
                : MOCK_ANOMALY_SUMMARY_MULTI_TACTIC
            ),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).toContainText(
          'Unusual Process For a Linux Host'
        );

        await pageObjects.entityFlyoutAnomaliesPage.selectMitreTactic('Credential Access');

        await expect(pageObjects.entityFlyoutAnomaliesPage.mitreTacticClearChip).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).not.toContainText(
          'Unusual Process For a Linux Host'
        );
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).toContainText(
          'Spike in Logon Events'
        );

        await pageObjects.entityFlyoutAnomaliesPage.clearMitreTacticFilter();

        await expect(pageObjects.entityFlyoutAnomaliesPage.mitreTacticClearChip).toBeHidden();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).toContainText(
          'Unusual Process For a Linux Host'
        );
      }
    );
  }
);
