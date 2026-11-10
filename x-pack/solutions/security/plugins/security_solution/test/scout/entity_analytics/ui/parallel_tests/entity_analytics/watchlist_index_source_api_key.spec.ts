/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

// The missing API key state (callout + Re-authorize) cannot be produced through the public API,
// so it is covered by Jest in `public/entity_analytics/components/watchlists/flyout/`
// (`rule_based_source_input.test.tsx`, `hooks/use_get_watchlist_form_data.test.ts`).
spaceTest.describe(
  'Watchlist edit flyout with an authorized index source',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let watchlistId: string | undefined;
    let watchlistName: string;
    let indexName: string;

    spaceTest.beforeAll(async ({ esClient, apiServices, scoutSpace }) => {
      // Under `auditbeat-*` so the browser role can read its fields (timestamp check in the form).
      indexName = `auditbeat-scout-watchlist-${scoutSpace.id}`;
      watchlistName = `scout-watchlist-${scoutSpace.id}`;

      await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            user: { properties: { name: { type: 'keyword' } } },
          },
        },
      });

      const watchlist = await apiServices.entityAnalytics.createWatchlist({
        name: watchlistName,
        riskModifier: 1,
        entitySources: [
          {
            type: 'index',
            name: `scout-index-source-${scoutSpace.id}`,
            indexPattern: indexName,
            identifierField: 'user.name',
          },
        ],
      });
      watchlistId = watchlist.id;

      // Premise of the spec: the server granted the source an API key on creation.
      expect(watchlist.entitySources?.[0]?.apiKeyId).toStrictEqual(expect.any(String));
      expect(watchlist.entitySources?.[0]?.apiKeyId).not.toBe('');
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterAll(async ({ esClient, apiServices, scoutSpace }) => {
      if (watchlistId) {
        // Also deletes the linked entity source and invalidates its API key.
        await apiServices.entityAnalytics.deleteWatchlist(watchlistId);
      }
      await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
      // Per-space index shared by all watchlists in the space; the space delete does not remove it.
      await esClient.indices.delete({
        index: `.entity_analytics.watchlists.${scoutSpace.id}`,
        ignore_unavailable: true,
      });
    });

    spaceTest(
      'opens the edit flyout for the index source without the missing API key warning',
      async ({ pageObjects }) => {
        const managementPage = pageObjects.entityAnalyticsManagementPage;
        const flyout = pageObjects.watchlistEditFlyout;

        await spaceTest.step('open the Watchlists tab', async () => {
          await managementPage.navigate();
          await managementPage.navigateToWatchlistsTab();
          await expect(managementPage.watchlistRow(watchlistName)).toBeVisible();
        });

        await spaceTest.step('open the edit flyout of the watchlist', async () => {
          await managementPage.openWatchlistEdit(watchlistName);
          await expect(flyout.header).toContainText('Edit watchlist');
        });

        await spaceTest.step('the flyout loads the authorized index source', async () => {
          // Positive check first: the index pattern comes from the same entity sources
          // response that decides whether the warning is shown.
          await expect(flyout.indexPatternComboBox).toContainText(indexName);
          await expect(flyout.missingApiKeyCallout).toBeHidden();
        });
      }
    );
  }
);
