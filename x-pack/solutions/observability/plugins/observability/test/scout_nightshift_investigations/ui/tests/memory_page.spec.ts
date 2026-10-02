/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../scout/ui/fixtures';
import { mockInvestigationApi } from '../fixtures/mocks';
import {
  attachScreenshot,
  deleteSeededMemories,
  MEMORY_CONFIGURE_ROLE,
  MEMORY_INDEX,
  MEMORY_MANAGER_ROLE,
  MEMORY_READER_ROLE,
  memoryPath,
  minutesAgo,
  memoryHeaderTab,
  memoryUrl,
  OTHER_SPACE_ID,
  seedMemory,
  SEEDED_AGENT_ID,
  sidebarPageIds,
  storedMemoryId,
  telemetryPercent,
  waitForMemoryIndex,
} from '../fixtures/memory';

const suffix = randomUUID().slice(0, 8);
const slug = (name: string) => `${name}-${suffix}`;

/** The conversation the seeded provenance points at. It need not exist: E7 is about the URL. */
const SEEDED_CONVERSATION_ID = `conv-${randomUUID()}`;

/** The memory most of the read-path cases use. Sorts first: the newest `updated_at`. */
const MAIN = slug('checkout-latency-postmortem');
const ARCHIVE_ME = slug('archive-me');
const DELETE_ME = slug('delete-me');
const MERGED_ROOT = slug('merged-checkout-timeout');
const MERGED_SOURCE_A = slug('merged-checkout-dns');
const MERGED_SOURCE_B = slug('merged-checkout-pool');
const MERGED_GRANDPARENT = slug('merged-checkout-connection-pool');
const OTHER_SPACE_MEMORY = slug('other-space-only');
/** Enough rows to cross the 25-per-page list query, all on one `updated_at`. */
const PAGE_SIZE_SLUGS = Array.from({ length: 30 }, (_, index) => slug(`paged-${index}`));

const MAIN_TITLE = 'Checkout latency postmortem: consumer lag and DNS';
/** The `context` E11 searches for: only this memory carries the phrase. */
const SEARCH_PHRASE = 'ingest-2 queue backlog';

test.describe(
  'Semantic Memory page',
  {
    // Stateful classic only. Semantic Memory needs its own Kibana flag, which the
    // `nightshift_investigations` config set turns on for the stateful flavor only,
    // so the serverless lanes of this config must not run these tests.
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeAll(async ({ esClient, log, apiServices }) => {
      await waitForMemoryIndex(esClient, log);
      // E12 needs a second real Space, not a space_id string on a document: the
      // routes scope by `getSpaceId(request)`, so only a real Space exercises it.
      await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });

      await seedMemory(esClient, {
        slug: MAIN,
        title: MAIN_TITLE,
        content:
          '## What happened\n\nConsumer lag on the checkout topic climbed to 40k while DNS ' +
          'resolution flapped inside the pod.\n\n## Fix\n\nRaise the cache size and keep the ' +
          'resolver warm.',
        context: 'Investigate why checkout latency spiked after the DNS cache change',
        tags: ['checkout', 'dns'],
        // 6 of 8 → 75%, and nothing to decay between the seed and the assertion.
        impressions: 8,
        conversions: 6,
        updatedAt: minutesAgo(1),
        conversationId: SEEDED_CONVERSATION_ID,
        agentId: SEEDED_AGENT_ID,
      });

      // One surfaced once and marked useful: rate 1.0, confidence near zero. The
      // "large cell, pale colour" quadrant the treemap exists to show.
      await seedMemory(esClient, {
        slug: slug('single-impression-fluke'),
        title: 'Single-impression signal',
        impressions: 1,
        conversions: 1,
        updatedAt: minutesAgo(2),
      });

      // The opposite corner: a rate the maths has actually seen enough of.
      await seedMemory(esClient, {
        slug: slug('well-evidenced-runbook'),
        title: 'Well evidenced runbook',
        impressions: 200,
        conversions: 180,
        updatedAt: minutesAgo(3),
      });

      // E11's target. Only this document's `context` carries the phrase.
      await seedMemory(esClient, {
        slug: slug('ingest-backlog-runbook'),
        title: 'Ingest backlog runbook',
        context: `Diagnose the ${SEARCH_PHRASE} using ES|QL over logs-*`,
        impressions: 5,
        conversions: 4,
        updatedAt: minutesAgo(4),
      });

      await seedMemory(esClient, {
        slug: ARCHIVE_ME,
        title: 'Retire me from the active list',
        impressions: 3,
        conversions: 1,
        updatedAt: minutesAgo(5),
      });

      await seedMemory(esClient, {
        slug: DELETE_ME,
        title: 'Delete me permanently',
        impressions: 2,
        conversions: 0,
        updatedAt: minutesAgo(6),
      });

      // E4: archived by a person, which is the only reason the UI can show.
      await seedMemory(esClient, {
        slug: slug('archived-dns-myth'),
        title: 'Archived DNS root cause claim',
        impressions: 4,
        conversions: 0,
        updatedAt: minutesAgo(7),
        archiveReason: 'manual',
      });

      // E6: a merge is a fan-in, so the root has two direct sources and one of
      // those has a source of its own — two levels, which is what the lineage
      // rows by level rather than flattening into one list.
      await seedMemory(esClient, {
        slug: MERGED_GRANDPARENT,
        title: 'Checkout connection pool exhausted',
        archiveReason: 'merged',
        updatedAt: minutesAgo(30),
      });
      await seedMemory(esClient, {
        slug: MERGED_SOURCE_A,
        title: 'Checkout DNS resolution stalled',
        mergedFrom: [`memory_${MERGED_GRANDPARENT}`],
        archiveReason: 'merged',
        updatedAt: minutesAgo(20),
      });
      await seedMemory(esClient, {
        slug: MERGED_SOURCE_B,
        title: 'Checkout consumer pool saturation',
        archiveReason: 'merged',
        updatedAt: minutesAgo(19),
      });
      await seedMemory(esClient, {
        slug: MERGED_ROOT,
        title: 'Checkout timeout synthesis',
        mergedFrom: [`memory_${MERGED_SOURCE_A}`, `memory_${MERGED_SOURCE_B}`],
        impressions: 12,
        conversions: 9,
        updatedAt: minutesAgo(18),
      });

      // E5: one shared `updated_at` across the whole set. The store sorts on
      // `updated_at desc, slug asc` precisely because the timestamp alone is not a
      // total order, and that tiebreaker is what paging depends on.
      for (const pageSlug of PAGE_SIZE_SLUGS) {
        await seedMemory(esClient, {
          slug: pageSlug,
          title: `Paged memory ${pageSlug}`,
          impressions: 1,
          conversions: 0,
          updatedAt: minutesAgo(60),
        });
      }

      await seedMemory(esClient, {
        spaceId: OTHER_SPACE_ID,
        slug: OTHER_SPACE_MEMORY,
        title: 'Belongs to the other Space',
        impressions: 9,
        conversions: 9,
        updatedAt: minutesAgo(1),
      });
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      // Significant Events refuses to render its tabs at all until the
      // availability route says so, and that route needs the plugin's managed
      // index. The alert spec in this suite stubs the same thing.
      await mockInvestigationApi(page);
      await browserAuth.loginWithCustomRole(MEMORY_CONFIGURE_ROLE);
    });

    test.afterAll(async ({ esClient, apiServices }) => {
      await deleteSeededMemories(esClient, ['default', OTHER_SPACE_ID]);
      await apiServices.spaces.delete(OTHER_SPACE_ID);
    });

    /**
     * Opens the Memory page by loading its route, the way a bookmark or a pasted
     * link does.
     *
     * That used to bounce to Streams: the page builds its tab list from an
     * availability query that is still pending on the first render, so `memory` was
     * briefly not one of its tabs and an unknown tab is redirected to the first
     * one. Loading the route directly and staying on it is the assertion.
     */
    const gotoMemory = async (page: ScoutPage, kbnUrl: KibanaUrl, spaceId?: string) => {
      await page.goto(memoryUrl(kbnUrl, spaceId));
      await expect.poll(() => page.url(), { timeout: 30_000 }).toContain(memoryPath(spaceId));
      await expect(page.testSubj.locator('nightshiftMemoryTab')).toBeVisible();
    };

    /** Reload on the Memory route and require it to still be Memory afterwards. */
    const reloadMemory = async (page: ScoutPage, spaceId?: string) => {
      await page.reload();
      await expect.poll(() => page.url(), { timeout: 30_000 }).toContain(memoryPath(spaceId));
      await expect(page.testSubj.locator('nightshiftMemoryTab')).toBeVisible();
    };

    test('E1 lists the seeded memories on a cold load of the route', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      // `gotoMemory` asserts the URL survived the load, which is the tab being
      // mounted: the page redirects anything it does not recognise to its first tab,
      // so landing on Memory at all means Memory was a tab.
      await gotoMemory(page, kbnUrl);

      await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`)).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryHome')).toBeVisible();
      // The treemap is drawn from the store's own ranking, not from the seeded
      // list, so its presence proves a second, larger query answered too.
      await expect(page.testSubj.locator('nightshiftMemoryTreemap')).toBeVisible();
      await attachScreenshot(page, testInfo, 'memory-e1-list');
    });

    test('E1b keeps the Memory tab in the header once the gate has settled', async ({
      page,
      kbnUrl,
    }) => {
      await gotoMemory(page, kbnUrl);

      // The header entry is only rendered once the availability query says the flag
      // is on, so its presence is the gate having settled rather than the page
      // having defaulted to showing it.
      await expect(memoryHeaderTab(page)).toBeVisible();
      await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`)).toBeVisible();
    });

    test('E2 opens one memory and shows its title, content, usefulness and confidence', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`).click();

      await expect(page.testSubj.locator('nightshiftMemoryPageTitle')).toHaveText(MAIN_TITLE);
      await expect(page.getByText('Raise the cache size')).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryUsefulnessValue')).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryConfidenceValue')).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryContext')).toContainText(
        'Investigate why checkout latency spiked'
      );
      await attachScreenshot(page, testInfo, 'memory-e2-detail');
    });

    test('E3 reports the seeded usefulness, decayed, and separates it from confidence', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);

      // 6 conversions of 8 impressions is 75%. Both counters decay by the same
      // factor, so the rate holds however long the assertions take.
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`).click();
      expect(await telemetryPercent(page, 'nightshiftMemoryUsefulnessValue')).toBe(75);
      // Eight impressions is thin evidence, so confidence must read low even
      // though usefulness reads high — the two numbers are not the same claim.
      expect(await telemetryPercent(page, 'nightshiftMemoryConfidenceValue')).toBeLessThan(50);

      await page.testSubj.locator('nightshiftMemoryHomeNav').click();
      await page.testSubj
        .locator(`nightshiftMemoryLink-memory_${slug('single-impression-fluke')}`)
        .click();
      // One impression marked useful: a perfect rate and almost no confidence.
      expect(await telemetryPercent(page, 'nightshiftMemoryUsefulnessValue')).toBe(100);
      const flukeConfidence = await telemetryPercent(page, 'nightshiftMemoryConfidenceValue');

      await page.testSubj.locator('nightshiftMemoryHomeNav').click();
      await page.testSubj
        .locator(`nightshiftMemoryLink-memory_${slug('well-evidenced-runbook')}`)
        .click();
      expect(await telemetryPercent(page, 'nightshiftMemoryUsefulnessValue')).toBe(90);
      const provenConfidence = await telemetryPercent(page, 'nightshiftMemoryConfidenceValue');

      // The two quadrants the treemap draws, in numbers.
      expect(provenConfidence).toBeGreaterThan(70);
      expect(provenConfidence).toBeGreaterThan(flukeConfidence);
      await attachScreenshot(page, testInfo, 'memory-e3-telemetry');
    });

    test('E4 separates archived memories by their reason', async ({ page, kbnUrl }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      const archivedSlug = slug('archived-dns-myth');

      // The tab opens on Active, so an archived memory must not be listed there.
      await expect(
        page.testSubj.locator(`nightshiftMemoryLink-memory_${archivedSlug}`)
      ).toHaveCount(0);

      await page.testSubj.locator('nightshiftMemoryFilter-archived').click();
      await expect(
        page.testSubj.locator(`nightshiftMemoryLink-memory_${archivedSlug}`)
      ).toBeVisible();
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${archivedSlug}`).click();
      // The reason, not just a badge: a person retired it, and the UI says who.
      await expect(page.testSubj.locator('nightshiftMemoryArchivedBadge')).toHaveText(
        'archived by a person'
      );
      await attachScreenshot(page, testInfo, 'memory-e4-archived');
    });

    test('E5 pages past the first 25 rows without skipping or repeating one', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);

      const firstPage = await sidebarPageIds(page);
      // 30 seeded rows on one `updated_at`, plus the rest of the fixture set: more
      // rows than the 25 the list query returns.
      expect(PAGE_SIZE_SLUGS.length).toBeGreaterThan(25);

      const loadMore = page.testSubj.locator('nightshiftMemoryLoadMore');
      await expect(loadMore).toBeVisible();
      await loadMore.click();
      await expect(loadMore).toHaveCount(0);

      const all = await sidebarPageIds(page);
      expect(new Set(all).size).toBe(all.length);
      for (const pageSlug of PAGE_SIZE_SLUGS) {
        // Exactly once: a `search_after` sort on a non-unique `updated_at` is what
        // silently drops or repeats a row, so the count is the assertion, not just
        // the presence.
        await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${pageSlug}`)).toHaveCount(
          1
        );
      }
      // Nothing from the first page was dropped when the second one arrived.
      for (const id of firstPage) {
        expect(all).toContain(id);
      }
      await attachScreenshot(page, testInfo, 'memory-e5-pagination');
    });

    test('E6 renders a merge lineage one level per row, each crumb linking to its source', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${MERGED_ROOT}`).click();

      const level1 = page.testSubj.locator('nightshiftMemoryLineageLevel-1');
      const level2 = page.testSubj.locator('nightshiftMemoryLineageLevel-2');
      await expect(level1).toBeVisible();
      await expect(level2).toBeVisible();
      // A merge is a fan-in: two direct sources, and only one of them merged again.
      // The crumbs are `EuiLink`s without an `href`, so they render as buttons;
      // they are matched on their own test subject rather than on the tag.
      const crumbsIn = (level: typeof level1) =>
        level.locator('[data-test-subj^="nightshiftMemoryLineageCrumb-"]');
      await expect(crumbsIn(level1)).toHaveCount(2);
      await expect(crumbsIn(level2)).toHaveCount(1);
      const crumb = (level: typeof level1, id: string) =>
        level.locator(`[data-test-subj="nightshiftMemoryLineageCrumb-${id}"]`);
      await expect(crumb(level1, `memory_${MERGED_SOURCE_A}`)).toBeVisible();
      await expect(crumb(level1, `memory_${MERGED_SOURCE_B}`)).toBeVisible();
      await expect(crumb(level2, `memory_${MERGED_GRANDPARENT}`)).toBeVisible();

      await page.testSubj.locator(`nightshiftMemoryLineageCrumb-memory_${MERGED_SOURCE_A}`).click();
      await expect(page.testSubj.locator('nightshiftMemoryPageTitle')).toHaveText(
        'Checkout DNS resolution stalled'
      );
      await attachScreenshot(page, testInfo, 'memory-e6-lineage');
    });

    test('E7 links a memory to the Agent Builder conversation that produced it', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`).click();

      const link = page.testSubj.locator('nightshiftMemorySourceTaskLink');
      await expect(link).toBeVisible();
      // The canonical route is agent-scoped, so it needs both ids. A memory written
      // before `agent_id` was persisted only has the conversation, which resolves
      // through the legacy unscoped route.
      const href = link;
      await expect(href).toHaveAttribute(
        'href',
        `/app/agent_builder/agents/${SEEDED_AGENT_ID}/conversations/${SEEDED_CONVERSATION_ID}`
      );

      await link.click();
      await expect
        .poll(() => page.url())
        .toContain(
          `/app/agent_builder/agents/${SEEDED_AGENT_ID}/conversations/${SEEDED_CONVERSATION_ID}`
        );
      // The assertion is the route the browser resolved. Agent Builder then shows
      // its own empty state on a Scout stack (no chat connector is configured
      // there), which is not what this test is about, so wait only for the app
      // shell to paint before capturing.
      await page.testSubj
        .locator('kbnChromeLayoutApplication')
        .waitFor({ state: 'visible', timeout: 30_000 });
      await attachScreenshot(page, testInfo, 'memory-e7-source-task');
    });

    test('E8 archives a memory from the UI and E9 restores it', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      const link = page.testSubj.locator(`nightshiftMemoryLink-memory_${ARCHIVE_ME}`);
      await link.click();

      await page.testSubj.locator('nightshiftMemoryArchiveToggle').click();
      await expect(page.testSubj.locator('nightshiftMemoryArchivedBadge')).toHaveText(
        'archived by a person'
      );

      // Reload rather than trust the client cache: the claim is that the write
      // reached Elasticsearch and the read path reports it.
      await reloadMemory(page);
      await page.testSubj.locator('nightshiftMemoryFilter-all').click();
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${ARCHIVE_ME}`).click();
      await expect(page.testSubj.locator('nightshiftMemoryArchivedBadge')).toHaveText(
        'archived by a person'
      );
      await attachScreenshot(page, testInfo, 'memory-e8-archived');

      await page.testSubj.locator('nightshiftMemoryArchiveToggle').click();
      await expect(page.testSubj.locator('nightshiftMemoryArchivedBadge')).toHaveCount(0);

      await reloadMemory(page);
      // Unarchive has to clear the reason, not just hide the badge: the Active
      // filter is the `exists archive_reason` query, so a stale reason stays archived.
      await expect(
        page.testSubj.locator(`nightshiftMemoryLink-memory_${ARCHIVE_ME}`)
      ).toBeVisible();
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${ARCHIVE_ME}`).click();
      await expect(page.testSubj.locator('nightshiftMemoryArchivedBadge')).toHaveCount(0);
    });

    test('E10 deletes a memory permanently, and it is gone from the index', async ({
      page,
      kbnUrl,
      esClient,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${DELETE_ME}`).click();

      await page.testSubj.locator('nightshiftMemoryDeleteButton').click();
      const confirm = page.testSubj.locator('nightshiftMemoryDeleteConfirm');
      await expect(confirm).toBeVisible();
      // The route refuses a title mismatch, so the dialog makes the operator
      // produce it rather than supplying it for them.
      const confirmButton = confirm.getByRole('button', { name: 'Delete permanently' });
      await expect(confirmButton).toBeDisabled();
      await page.testSubj
        .locator('nightshiftMemoryDeleteConfirmTitle')
        .fill('Delete me permanentlyy');
      await expect(confirmButton).toBeDisabled();
      await page.testSubj
        .locator('nightshiftMemoryDeleteConfirmTitle')
        .fill('Delete me permanently');
      await attachScreenshot(page, testInfo, 'memory-e10-delete-confirm');
      await confirmButton.click();

      await expect(page.testSubj.locator('nightshiftMemoryHome')).toBeVisible();
      await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${DELETE_ME}`)).toHaveCount(
        0
      );

      // The irreversible part, checked in Elasticsearch rather than in the UI.
      const remaining = await esClient.count({
        index: MEMORY_INDEX,
        query: { ids: { values: [storedMemoryId('default', DELETE_ME)] } },
      });
      expect(remaining.count).toBe(0);
    });

    test('E11 finds a memory by the context text it was learned from', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      const target = page.testSubj.locator(
        `nightshiftMemoryLink-memory_${slug('ingest-backlog-runbook')}`
      );
      await expect(target).toBeVisible();

      await page.testSubj.locator('nightshiftMemorySearch').fill(SEARCH_PHRASE);

      await expect(target).toBeVisible();
      // A search that matched everything would prove nothing about the context.
      await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`)).toHaveCount(0);
      await attachScreenshot(page, testInfo, 'memory-e11-search');
    });

    test('E12 keeps one Space out of another', async ({ page, kbnUrl }, testInfo) => {
      await gotoMemory(page, kbnUrl);

      // The other Space's memory is invisible here, and searching for it by name
      // is the strongest form of that: it is not merely sorted off the page.
      await page.testSubj.locator('nightshiftMemorySearch').fill('Belongs to the other Space');
      await expect(page.testSubj.locator('nightshiftMemorySidebarEmpty')).toBeVisible();
      await page.testSubj.locator('nightshiftMemorySearch').fill('');

      // And the other Space sees its own memory, not this Space's.
      await gotoMemory(page, kbnUrl, OTHER_SPACE_ID);
      await expect(
        page.testSubj.locator(`nightshiftMemoryLink-memory_${OTHER_SPACE_MEMORY}`)
      ).toBeVisible();
      await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${MAIN}`)).toHaveCount(0);
      await attachScreenshot(page, testInfo, 'memory-e12-space-isolation');
    });

    test('U2 shows the actions only to the tiers that hold the privilege', async ({
      page,
      kbnUrl,
      browserAuth,
    }, testInfo) => {
      const open = async (pageId: string) => {
        await gotoMemory(page, kbnUrl);
        await page.testSubj.locator(`nightshiftMemoryLink-${pageId}`).click();
        await expect(page.testSubj.locator('nightshiftMemoryPageTitle')).toBeVisible();
      };

      // A reader sees the memory but neither write.
      await browserAuth.loginWithCustomRole(MEMORY_READER_ROLE);
      await open(`memory_${MAIN}`);
      await expect(page.testSubj.locator('nightshiftMemoryPageTitle')).toHaveText(MAIN_TITLE);
      await expect(page.testSubj.locator('nightshiftMemoryArchiveToggle')).toHaveCount(0);
      await expect(page.testSubj.locator('nightshiftMemoryDeleteButton')).toHaveCount(0);
      await attachScreenshot(page, testInfo, 'memory-u2-reader');

      // Manage can archive and restore, and still cannot delete.
      await browserAuth.loginWithCustomRole(MEMORY_MANAGER_ROLE);
      await open(`memory_${MAIN}`);
      await expect(page.testSubj.locator('nightshiftMemoryArchiveToggle')).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryDeleteButton')).toHaveCount(0);

      // Configure adds the irreversible one.
      await browserAuth.loginWithCustomRole(MEMORY_CONFIGURE_ROLE);
      await open(`memory_${MAIN}`);
      await expect(page.testSubj.locator('nightshiftMemoryDeleteButton')).toBeVisible();
      await attachScreenshot(page, testInfo, 'memory-u2-configure');
    });
  }
);
