/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient, KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../scout/ui/fixtures';
import { mockInvestigationApi } from '../fixtures/mocks';
import {
  attachScreenshot,
  deleteSeededMemories,
  type SeedMemoryOptions,
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
} from '../fixtures/memory';

const suffix = randomUUID().slice(0, 8);
const slug = (name: string) => `${name}-${suffix}`;

/**
 * A Space this suite owns, created and deleted around the run.
 *
 * The default Space is shared with every other suite on the deployment, so a
 * pre-existing memory there would move the header's totals and its archived
 * count under assertions that are about this run's fixture. Seeding here is what
 * makes those numbers exact, and it is why teardown can be precise as well.
 */
const SUITE_SPACE_ID = `memory-ui-${randomUUID().slice(0, 8)}`;

/** Every document this run seeded, so teardown deletes those and nothing else. */
const seededDocumentIds: string[] = [];
const seed = async (esClient: EsClient, options: SeedMemoryOptions) => {
  seededDocumentIds.push(storedMemoryId(options.spaceId ?? SUITE_SPACE_ID, options.slug));
  return seedMemory(esClient, { spaceId: SUITE_SPACE_ID, ...options });
};

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
/**
 * Archived memories this run seeds in its own Space: one retired by a person
 * and three merge sources. The header's archived count has to see them while the
 * sidebar is showing Active.
 */
const ARCHIVED_SEEDED_COUNT = 4;
/** Enough rows to cross the 25-per-page list query, all on one `updated_at`. */
const PAGE_SIZE_SLUGS = Array.from({ length: 30 }, (_, index) => slug(`paged-${index}`));

const MAIN_TITLE = 'Checkout latency postmortem: consumer lag and DNS';
/** The Agent Builder conversation route the provenance link points at. */
const SOURCE_TASK_PATH = `/app/agent_builder/agents/${SEEDED_AGENT_ID}/conversations/${SEEDED_CONVERSATION_ID}`;
/** Every reader is in the suite's own Space, so its URLs are Space-scoped. */
const scoped = (path: string): string => `/s/${SUITE_SPACE_ID}${path}`;

/** The task-recall text (`context`, stored as `description`) E11 searches for. */
const SEARCH_PHRASE = 'ingest-2 queue backlog';

/**
 * E13's keyword graph.
 *
 * `invoke-agent` is deliberately the most connected keyword and `checkout` the
 * next, so the two cells E13 clicks are the two largest ones: a treemap draws
 * its biggest cell as the top strip, which is where the test aims.
 */
const KEYWORD_DOCS: { key: string; tags: string[] }[] = [
  { key: 'checkout-invoke-agent', tags: ['invoke-agent', 'checkout'] },
  { key: 'dns-invoke-agent', tags: ['invoke-agent', 'dns'] },
  { key: 'traces-invoke-agent', tags: ['invoke-agent', 'traces'] },
  { key: 'cart-cache-invoke-agent', tags: ['invoke-agent', 'cart-cache'] },
  { key: 'traces-invoke-agent-hub', tags: ['invoke-agent', 'checkout', 'traces'] },
  { key: 'redis-invoke-agent', tags: ['invoke-agent', 'redis'] },
  { key: 'checkout-invoke-agent-runbook', tags: ['invoke-agent', 'checkout'] },
  // The one memory without the keyword: it is what proves the filter filtered.
  { key: 'checkout-redis-runbook', tags: ['checkout', 'redis'] },
];

/** The canonical keyword E13 filters by, and the key the chip carries. */
const INVOKE_AGENT_KEYWORD = 'invoke-agent';
const CHECKOUT_KEYWORD = 'checkout';

/**
 * Every active document this run seeds: the paged rows, the keyword graph, and
 * the four single-purpose memories `MAIN` plus the search, archive and delete
 * targets. The archived documents are not listed while the sidebar shows Active.
 */
const SEEDED_ACTIVE_COUNT = PAGE_SIZE_SLUGS.length + KEYWORD_DOCS.length + 4;

const KEYWORD_DOCS_WITH_INVOKE_AGENT = KEYWORD_DOCS.filter((doc) =>
  doc.tags.includes(INVOKE_AGENT_KEYWORD)
).map((doc) => doc.key);
const KEYWORD_DOCS_WITH_BOTH = KEYWORD_DOCS.filter(
  (doc) => doc.tags.includes(INVOKE_AGENT_KEYWORD) && doc.tags.includes(CHECKOUT_KEYWORD)
).map((doc) => doc.key);

test.describe(
  'Semantic Memory page',
  {
    // Stateful classic only. Semantic Memory needs its own Kibana flag, which the
    // `nightshift_investigations` config set turns on for the stateful flavor only,
    // so the serverless lanes of this config must not run these tests.
    tag: tags.local.stateful.classic,
  },
  () => {
    test.beforeAll(async ({ esClient, apiServices }) => {
      // The routes scope by `getSpaceId(request)`, so both Spaces this suite uses
      // are real ones rather than a space_id string on a document.
      await apiServices.spaces.create({ id: SUITE_SPACE_ID, name: SUITE_SPACE_ID });
      await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });

      await seed(esClient, {
        slug: MAIN,
        title: MAIN_TITLE,
        content:
          '## What happened\n\nConsumer lag on the checkout topic climbed to 40k while DNS ' +
          'resolution flapped inside the pod.\n\n## Fix\n\nRaise the cache size and keep the ' +
          'resolver warm.',
        description: 'Investigate why checkout latency spiked after the DNS cache change',
        tags: ['checkout', 'dns'],
        // 6 of 8 → 75%, and nothing to decay between the seed and the assertion.
        impressions: 8,
        conversions: 6,
        updatedAt: minutesAgo(1),
        conversationId: SEEDED_CONVERSATION_ID,
        agentId: SEEDED_AGENT_ID,
      });

      // E11's target. Only this document's `description` carries the phrase, and
      // it is older than the 30 pagination documents, so it is beyond the
      // sidebar's first 25-row page: finding it proves the search ran on the server.
      await seed(esClient, {
        slug: slug('ingest-backlog-runbook'),
        title: 'Ingest backlog runbook',
        description: `Diagnose the ${SEARCH_PHRASE} using ES|QL over logs-*`,
        impressions: 5,
        conversions: 4,
        updatedAt: minutesAgo(120),
      });

      await seed(esClient, {
        slug: ARCHIVE_ME,
        title: 'Retire me from the active list',
        impressions: 3,
        conversions: 1,
        updatedAt: minutesAgo(5),
      });

      await seed(esClient, {
        slug: DELETE_ME,
        title: 'Delete me permanently',
        impressions: 2,
        conversions: 0,
        updatedAt: minutesAgo(6),
      });

      // E4: archived by a person, which is the only reason the UI can show.
      await seed(esClient, {
        slug: slug('archived-dns-myth'),
        title: 'Archived DNS root cause claim',
        impressions: 4,
        conversions: 0,
        updatedAt: minutesAgo(7),
        archiveReason: 'manual',
      });

      // E6: a merge is a fan-in, so the root has two direct sources, and one of
      // those was itself merged from `MERGED_GRANDPARENT`. The root's row names
      // its own sources only, so the grandparent proves the walk stops there.
      await seed(esClient, {
        slug: MERGED_GRANDPARENT,
        title: 'Checkout connection pool exhausted',
        archiveReason: 'merged',
        updatedAt: minutesAgo(30),
      });
      await seed(esClient, {
        slug: MERGED_SOURCE_A,
        title: 'Checkout DNS resolution stalled',
        mergedFrom: [`memory_${MERGED_GRANDPARENT}`],
        archiveReason: 'merged',
        updatedAt: minutesAgo(20),
      });
      await seed(esClient, {
        slug: MERGED_SOURCE_B,
        title: 'Checkout consumer pool saturation',
        archiveReason: 'merged',
        updatedAt: minutesAgo(19),
      });
      await seed(esClient, {
        slug: MERGED_ROOT,
        title: 'Checkout timeout synthesis',
        mergedFrom: [`memory_${MERGED_SOURCE_A}`, `memory_${MERGED_SOURCE_B}`],
        impressions: 12,
        conversions: 9,
        updatedAt: minutesAgo(18),
      });

      // E5: one shared `updated_at` across the whole set, computed once. The store
      // sorts on `updated_at desc, slug asc` precisely because the timestamp alone
      // is not a total order, and that tiebreaker is what paging depends on — so
      // the fixture has to give `search_after` a tied sort key to break.
      const pagedUpdatedAt = minutesAgo(60);
      for (const pageSlug of PAGE_SIZE_SLUGS) {
        await seed(esClient, {
          slug: pageSlug,
          title: `Paged memory ${pageSlug}`,
          impressions: 1,
          conversions: 0,
          updatedAt: pagedUpdatedAt,
        });
      }

      // E13's keyword graph. Recent enough to be inside the sidebar's first page,
      // so the home lists can be checked as well as the header count.
      for (const [index, doc] of KEYWORD_DOCS.entries()) {
        await seed(esClient, {
          slug: slug(doc.key),
          title: `Keyword memory ${doc.key}`,
          tags: doc.tags,
          impressions: 200,
          conversions: 150,
          updatedAt: minutesAgo(index + 1),
        });
      }

      await seed(esClient, {
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
      await deleteSeededMemories(esClient, seededDocumentIds);
      await apiServices.spaces.delete(SUITE_SPACE_ID);
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
    const gotoMemory = async (
      page: ScoutPage,
      kbnUrl: KibanaUrl,
      spaceId: string = SUITE_SPACE_ID
    ) => {
      await page.goto(memoryUrl(kbnUrl, spaceId));
      await expect.poll(() => page.url(), { timeout: 30_000 }).toContain(memoryPath(spaceId));
      await expect(page.testSubj.locator('nightshiftMemoryTab')).toBeVisible();
    };

    /** Reload on the Memory route and require it to still be Memory afterwards. */
    const reloadMemory = async (page: ScoutPage, spaceId: string = SUITE_SPACE_ID) => {
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
      // The keyword treemap is drawn from the store's own ranking, over one wide
      // query rather than the seeded list, so its presence proves a second,
      // larger query answered too.
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
      // The two numbers the route computed, rendered: 6 conversions of 8
      // impressions is 75% and does not decay, because both counters decay by the
      // same factor. Eight impressions is thin evidence, so confidence reads low
      // even though usefulness reads high — the two are not the same claim. The
      // maths itself is covered where it lives (`server/memory/ranking.test.ts`).
      expect(await telemetryPercent(page, 'nightshiftMemoryUsefulnessValue')).toBe(75);
      expect(await telemetryPercent(page, 'nightshiftMemoryConfidenceValue')).toBeLessThan(50);
      // The task the memory was learned from is one row of the metadata footer,
      // not a panel of its own: it is provenance, not part of the memory.
      await expect(page.testSubj.locator('nightshiftMemorySourceTask')).toContainText(
        'Investigate why checkout latency spiked'
      );
      await attachScreenshot(page, testInfo, 'memory-e2-detail');

      // A tag is a keyword the store already ranks, so clicking one is a
      // question about other memories: it leaves the one being read and filters
      // home by the canonical form of that tag.
      await page.testSubj.locator('nightshiftMemoryTag-checkout').click();
      await expect(page.testSubj.locator('nightshiftMemoryHome')).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryKeywordFilters')).toBeVisible();
      await expect(
        page.testSubj.locator(`nightshiftMemoryKeywordChip-${CHECKOUT_KEYWORD}`)
      ).toBeVisible();
      await attachScreenshot(page, testInfo, 'memory-e2-tag-filtered');
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
      // More seeded rows than the 25 one request returns, which is what makes the
      // second `search_after` cursor mean anything.
      expect(SEEDED_ACTIVE_COUNT).toBeGreaterThan(25);

      const loadMore = page.testSubj.locator('nightshiftMemoryLoadMore');
      // Plain locator: `testSubj` prefixes its argument with `data-test-subj=`,
      // which is not what a prefix selector wants.
      const rowsShown = async () =>
        (await page.locator('[data-test-subj^="nightshiftMemoryLink-"]').all()).length;
      await expect(loadMore).toBeVisible();
      // Page until the listing is exhausted rather than assuming a row count: the
      // Space holds what this run seeded plus whatever the store derives from
      // those pages, and only the owned rows are this suite's to count.
      for (let requested = 0; requested < 5 && (await loadMore.count()) > 0; requested++) {
        const before = await rowsShown();
        await loadMore.click();
        // Another page arrived, or the listing ran out and the button went with it.
        await expect
          .poll(async () => (await rowsShown()) > before || (await loadMore.count()) === 0)
          .toBe(true);
      }
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
      // Nothing from the first page was dropped when the later ones arrived.
      for (const id of firstPage) {
        expect(all).toContain(id);
      }
      await attachScreenshot(page, testInfo, 'memory-e5-pagination');
    });

    test('E6 names the direct sources of a merge, each one linking to its memory', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      await page.testSubj.locator(`nightshiftMemoryLink-memory_${MERGED_ROOT}`).click();

      const mergedFrom = page.testSubj.locator('nightshiftMemoryMergedFrom');
      await expect(mergedFrom).toBeVisible();
      // A merge is a fan-in: two direct sources, one row. A source that was
      // itself merged from `MERGED_GRANDPARENT` names that only on its own page.
      const sources = mergedFrom.locator('[data-test-subj^="nightshiftMemoryMergedFrom-"]');
      await expect(sources).toHaveCount(2);
      await expect(
        page.testSubj.locator(`nightshiftMemoryMergedFrom-memory_${MERGED_SOURCE_A}`)
      ).toBeVisible();
      await expect(
        page.testSubj.locator(`nightshiftMemoryMergedFrom-memory_${MERGED_SOURCE_B}`)
      ).toBeVisible();
      await expect(
        page.testSubj.locator(`nightshiftMemoryMergedFrom-memory_${MERGED_GRANDPARENT}`)
      ).toHaveCount(0);

      await page.testSubj.locator(`nightshiftMemoryMergedFrom-memory_${MERGED_SOURCE_A}`).click();
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
      // The link is the task text itself, so it names the conversation rather
      // than pointing at it.
      await expect(link).toHaveText(
        'Investigate why checkout latency spiked after the DNS cache change'
      );
      // The canonical route is agent-scoped, so it needs both ids, and the reader
      // is in a Space, so the link carries the Space too.
      await expect(link).toHaveAttribute('href', scoped(SOURCE_TASK_PATH));

      await link.click();
      await expect.poll(() => page.url()).toContain(scoped(SOURCE_TASK_PATH));
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
      await attachScreenshot(page, testInfo, 'memory-e10-delete-confirm');
      await confirm.getByRole('button', { name: 'Delete permanently' }).click();

      await expect(page.testSubj.locator('nightshiftMemoryHome')).toBeVisible();
      await expect(page.testSubj.locator(`nightshiftMemoryLink-memory_${DELETE_ME}`)).toHaveCount(
        0
      );

      // The irreversible part, checked in Elasticsearch rather than in the UI.
      const remaining = await esClient.count({
        index: MEMORY_INDEX,
        query: { ids: { values: [storedMemoryId(SUITE_SPACE_ID, DELETE_ME)] } },
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
      // Beyond the first 25-row page, so it cannot be on screen before the search.
      await expect(target).toHaveCount(0);

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

    /**
     * Clicks the treemap's largest cell and asserts which keyword that was.
     *
     * Elastic Charts draws a treemap to canvas, so there is no element per
     * keyword to click. The squarified layout puts the highest-valued cell in the
     * top strip spanning the full width, so aiming a quarter of the way down
     * hits it; the hover tooltip then names the keyword under the cursor, which
     * is read before the click rather than assumed afterwards.
     */
    /**
     * The treemap's canvas.
     *
     * The chart mounts its canvas only once the store-wide keyword query has
     * answered, so the panel is visible a moment before there is anything to
     * aim at.
     */
    const treemapCanvas = async (page: ScoutPage) => {
      const canvases = () => page.testSubj.locator('nightshiftMemoryTreemap').locator('canvas');
      await expect
        .poll(async () => (await canvases().all()).length, { timeout: 30_000 })
        .toBeGreaterThan(0);
      const [canvas] = await canvases().all();
      await expect(canvas).toBeVisible();
      return canvas;
    };

    const clickLargestCell = async (page: ScoutPage, expectedKeyword: string) => {
      const canvas = await treemapCanvas(page);
      const box = await canvas.boundingBox();
      if (box === null) throw new Error('The keyword treemap canvas has no box');

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 4;
      await page.mouse.move(x, y);
      const tooltip = page.testSubj.locator('nightshiftMemoryTreemapTooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(expectedKeyword);
      await page.mouse.click(x, y);
    };

    /**
     * The memory count in the home header, as a number.
     *
     * Polled rather than read once: the count follows the filtered query, so it
     * reads zero for as long as that query is in flight.
     */
    const expectHeaderTotal = async (page: ScoutPage, expected: number) => {
      const read = async () => {
        const text = await page.testSubj.locator('nightshiftMemoryHomeStats').innerText();
        return Number.parseInt(text, 10);
      };
      await expect.poll(read, { timeout: 30_000 }).toBe(expected);
    };

    /** The memory count in the home header, as a number. */
    const headerTotal = async (page: ScoutPage): Promise<number> => {
      const text = await page.testSubj.locator('nightshiftMemoryHomeStats').innerText();
      const parsed = Number.parseInt(text, 10);
      expect(Number.isNaN(parsed)).toBe(false);
      return parsed;
    };

    /** The archived count in the home header, as a number. */
    const headerArchived = async (page: ScoutPage): Promise<number> => {
      const text = await page.testSubj.locator('nightshiftMemoryHomeStats').innerText();
      const parsed = Number.parseInt(text.split('·')[1] ?? '', 10);
      expect(Number.isNaN(parsed)).toBe(false);
      return parsed;
    };

    /** The rows the two home lists show, as page ids, without the section headings. */
    const homeRowIds = async (page: ScoutPage): Promise<string[]> => {
      const rows = page.testSubj
        .locator('nightshiftMemoryHome')
        .locator('[data-test-subj^="nightshiftMemoryRow-"]');
      const all = await rows.all();
      return Promise.all(
        all.map((row) =>
          row
            .getAttribute('data-test-subj')
            .then((subj) => subj!.replace('nightshiftMemoryRow-', ''))
        )
      );
    };

    test('E13 filters the view by one keyword cell, then ANDs a second', async ({
      page,
      kbnUrl,
    }, testInfo) => {
      await gotoMemory(page, kbnUrl);
      const unfilteredTotal = await headerTotal(page);
      expect(KEYWORD_DOCS_WITH_INVOKE_AGENT.length).toBeGreaterThan(1);

      // The sidebar opens on Active, so an archived count of zero here would be
      // the count being taken from a listing that excludes archived memories. The
      // fixture archives four: one by a person and three merge sources.
      expect(await headerArchived(page)).toBe(ARCHIVED_SEEDED_COUNT);

      // The chart selects the canonical key.
      await clickLargestCell(page, INVOKE_AGENT_KEYWORD);
      const chip = page.testSubj.locator(`nightshiftMemoryKeywordChip-${INVOKE_AGENT_KEYWORD}`);
      await expect(chip).toBeVisible();
      await expect(page.testSubj.locator('nightshiftMemoryKeywordFilters')).toBeVisible();

      // The header count comes from the server, which matched the canonical tag
      // against the index: seven of the eight seeded memories carry it.
      await expectHeaderTotal(page, KEYWORD_DOCS_WITH_INVOKE_AGENT.length);
      const oneKeywordRows = await homeRowIds(page);
      for (const key of KEYWORD_DOCS_WITH_INVOKE_AGENT) {
        expect(oneKeywordRows).toContain(`memory_${slug(key)}`);
      }
      // And nothing that does not: the memory the filter left out, and a memory
      // from outside the keyword graph entirely.
      expect(oneKeywordRows).not.toContain(`memory_${slug('checkout-redis-runbook')}`);
      expect(oneKeywordRows).not.toContain(`memory_${MAIN}`);
      await attachScreenshot(page, testInfo, 'memory-e13-keyword-one');

      // A second cell is an AND, over the already filtered set. The first keyword
      // is gone from the chart rather than restyled, which is why the cell under
      // the cursor is now the runner-up.
      await clickLargestCell(page, CHECKOUT_KEYWORD);
      await expect(
        page.testSubj.locator(`nightshiftMemoryKeywordChip-${CHECKOUT_KEYWORD}`)
      ).toBeVisible();
      await expectHeaderTotal(page, KEYWORD_DOCS_WITH_BOTH.length);
      const bothRows = await homeRowIds(page);
      for (const key of KEYWORD_DOCS_WITH_BOTH) {
        expect(bothRows).toContain(`memory_${slug(key)}`);
      }
      await attachScreenshot(page, testInfo, 'memory-e13-keyword-both');

      // A chip removes its own filter.
      await page.testSubj.locator(`nightshiftMemoryKeywordChip-${CHECKOUT_KEYWORD}`).click();
      await expect(
        page.testSubj.locator(`nightshiftMemoryKeywordChip-${CHECKOUT_KEYWORD}`)
      ).toHaveCount(0);
      await expectHeaderTotal(page, KEYWORD_DOCS_WITH_INVOKE_AGENT.length);

      // "Clear all" puts the store back the way it was.
      await page.testSubj.locator('nightshiftMemoryClearKeywords').click();
      await expect(page.testSubj.locator('nightshiftMemoryKeywordFilters')).toHaveCount(0);
      await expectHeaderTotal(page, unfilteredTotal);
      await attachScreenshot(page, testInfo, 'memory-e13-keyword-cleared');
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
