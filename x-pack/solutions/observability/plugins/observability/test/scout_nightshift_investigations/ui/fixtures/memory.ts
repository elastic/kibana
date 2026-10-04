/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout-oblt/ui';
import type { EsClient, KibanaRole, KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

/** The plugin's own index. Not the `ai-index-idx-*` prefix, and hidden. */
export const MEMORY_INDEX = 'nightshift-semantic-memory';
/**
 * Significant Events registers this route; `/app/nightshift` is the separate
 * investigation console, and its `/{tab}` route does not serve the Memory page.
 */
const SIGNIFICANT_EVENTS_APP_ROUTE = 'significant_events';
/** Agent Builder conversation the seeded memories claim to have come from. */
export const SEEDED_AGENT_ID = 'nightshift.investigation';
/** A second Space, so space isolation is a real second tenancy and not a label. */
export const OTHER_SPACE_ID = `memory-e2e-${randomUUID().slice(0, 8)}`;

/**
 * The Memory page route, optionally inside a Space.
 *
 * Built from `kbnUrl` rather than a literal, because Scout configures no Playwright
 * `baseURL` and the app is mounted at its registered `appRoute`
 * (`/app/significant_events`) rather than at its id.
 */
export const memoryUrl = (kbnUrl: KibanaUrl, spaceId?: string): string =>
  kbnUrl.get(
    spaceId === undefined
      ? `app/${SIGNIFICANT_EVENTS_APP_ROUTE}/memory`
      : `s/${encodeURIComponent(spaceId)}/app/${SIGNIFICANT_EVENTS_APP_ROUTE}/memory`
  );

/** What the Memory page's URL must contain once it has loaded. */
export const memoryPath = (spaceId?: string): string =>
  spaceId === undefined
    ? `/app/${SIGNIFICANT_EVENTS_APP_ROUTE}/memory`
    : `/s/${encodeURIComponent(spaceId)}/app/${SIGNIFICANT_EVENTS_APP_ROUTE}/memory`;

/** The header entry that Memory renders once its availability gate has settled on. */
export const memoryHeaderTab = (page: ScoutPage) => page.getByRole('tab', { name: 'Memory' });

/**
 * The "Manage engines" sub-feature privilege of the Nightshift feature, which is
 * the only thing that grants `configure_nightshift` and the `configure` UI
 * capability. It is declared on a sub-feature with `includeIn: 'none'`, so no
 * value of the feature's own `all` grants it.
 */
const NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID = 'manage-engines';

const memoryRole = (nightshift: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      // The Memory routes are gated on `agentBuilder:read`; the Nightshift feature
      // is what grants the app and the `show`/`manage`/`configure` UI capabilities
      // the page reads to decide which actions to render.
      feature: { agentBuilder: ['read'], nightshift },
      spaces: ['*'],
    },
  ],
});

/** Reads Memory, cannot archive or delete. */
export const MEMORY_READER_ROLE = memoryRole(['read']);

/** Reads and archives/restores; still cannot delete. */
export const MEMORY_MANAGER_ROLE = memoryRole(['all']);

/** Reads, archives, and deletes. */
export const MEMORY_CONFIGURE_ROLE = memoryRole(['all', NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID]);

export interface SeedMemoryOptions {
  spaceId?: string;
  slug: string;
  title: string;
  content?: string;
  /** The user task this memory was learned from. The sidebar search reads it. */
  context?: string;
  tags?: string[];
  impressions?: number;
  conversions?: number;
  /**
   * `attributes.updated_at`. It is the sort key the store pages on, so a test that
   * pins it pins the row's position rather than hoping the clock cooperates.
   */
  updatedAt: string;
  createdAt?: string;
  conversationId?: string;
  agentId?: string;
  mergedFrom?: string[];
  archiveReason?: 'merged' | 'harmful' | 'manual';
}

/** A whole ISO minute before now, so seeded rows never collide on the sort key by accident. */
export const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * The document `page_store.ts` reads. Seeded straight into the real index: the
 * store's own mapping, `search_after` sort and stats aggregation are the ones
 * under test, so writing through the store would test nothing.
 */
export const toMemoryDocument = ({
  spaceId = 'default',
  slug,
  title,
  content = `Notes about ${title}.`,
  context = `Investigate ${title}`,
  tags = [],
  impressions = 0,
  conversions = 0,
  updatedAt,
  createdAt,
  conversationId,
  agentId,
  mergedFrom,
  archiveReason,
}: SeedMemoryOptions) => ({
  '@timestamp': updatedAt,
  type: 'memory',
  title,
  content,
  context,
  // The `memory` tag is the store's tenancy filter alongside `space_id`.
  tags: ['memory', ...tags],
  attributes: {
    slug,
    space_id: spaceId,
    agent_id: agentId,
    conversation_id: conversationId,
    categories: [],
    references: [],
    created_at: createdAt ?? updatedAt,
    updated_at: updatedAt,
    created_by: 'nightshift-scout-seed',
    updated_by: 'nightshift-scout-seed',
    impressions,
    conversions,
    // Fresh, so the read-time decay does not move the usefulness this test
    // asserts. Both counters decay by the same factor, so the rate holds either
    // way; pinning it keeps the confidence figure stable as well.
    last_impression_time: new Date().toISOString(),
    ...(mergedFrom ? { merged_from: mergedFrom } : {}),
    ...(archiveReason ? { archive_reason: archiveReason } : {}),
  },
});

/** `${spaceId}:${pageId}` is the stored id; the page id is `memory_<slug>`. */
export const storedMemoryId = (spaceId: string, slug: string): string =>
  `${spaceId}:memory_${slug}`;

export const seedMemory = async (
  esClient: EsClient,
  options: SeedMemoryOptions
): Promise<string> => {
  const spaceId = options.spaceId ?? 'default';
  const pageId = `memory_${options.slug}`;
  await esClient.index({
    index: MEMORY_INDEX,
    id: storedMemoryId(spaceId, options.slug),
    document: toMemoryDocument(options),
    refresh: 'wait_for',
  });
  return pageId;
};

/**
 * `memoryService.initialize()` runs fire-and-forget on plugin start, so the index
 * can still be being created when the suite's first write lands. Wait for it.
 */
export const waitForMemoryIndex = async (
  esClient: EsClient,
  log: { info: (m: string) => void }
) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const exists = await esClient.indices.exists({ index: MEMORY_INDEX });
    if (exists) return;
    log.info(`Memory index not created yet, waiting (attempt ${attempt + 1}/60)`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Index ${MEMORY_INDEX} was not created within 60s`);
};

/**
 * Removes exactly the documents this run seeded.
 *
 * Scoped by id rather than by Space: a shared deployment's default Space holds
 * memories this suite never wrote, and deleting those would leak state into
 * whatever runs next.
 */
export const deleteSeededMemories = async (
  esClient: EsClient,
  documentIds: readonly string[]
): Promise<void> => {
  for (const id of documentIds) {
    try {
      await esClient.delete({ index: MEMORY_INDEX, id, refresh: true });
    } catch (err) {
      // A test that deleted its own document (E10) needs no cleanup, and an
      // interrupted run can leave a gap.
      if ((err as { statusCode?: number }).statusCode !== 404) throw err;
    }
  }
};

/**
 * The part of Playwright's `testInfo` the screenshot helper uses. Scout re-exports
 * no `TestInfo`, and the observability suites may not import `@playwright/test`,
 * so the one method that is needed is declared here instead.
 */
interface AttachmentSink {
  attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void>;
}

/**
 * Screenshots go to the Playwright report either way, so CI keeps them as
 * artifacts. `NIGHTSHIFT_SHOTS_DIR` additionally drops the PNGs on disk for the
 * closed-loop review; it is off by default so a CI run does not fill a directory
 * nobody reads.
 */
export const attachScreenshot = async (
  page: ScoutPage,
  testInfo: AttachmentSink,
  name: string
): Promise<void> => {
  const png = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(name, { body: png, contentType: 'image/png' });

  const dir = process.env.NIGHTSHIFT_SHOTS_DIR;
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${name}.png`), png);
};

/** The memory ids currently listed in the sidebar, in the order they are shown. */
export const sidebarPageIds = async (page: ScoutPage): Promise<string[]> => {
  const links = page.locator('[data-test-subj^="nightshiftMemoryLink-"]');
  const all = await links.all();
  // A sidebar that has not rendered yet would read as an empty list, which the
  // caller would mistake for "there are no memories". Wait for one first.
  await expect.poll(() => all.length).toBeGreaterThan(0);
  return Promise.all(
    all.map((link) =>
      link.getAttribute('data-test-subj').then((subj) => subj!.replace('nightshiftMemoryLink-', ''))
    )
  );
};

/**
 * Reads one telemetry figure out of the detail view, as a percentage.
 *
 * The value is rendered as an EUI `FormattedNumber`, so the DOM holds a
 * locale-formatted string ("75%", "1,234%") rather than a raw ratio.
 */
export const telemetryPercent = async (page: ScoutPage, testSubj: string): Promise<number> => {
  const text = await page.testSubj
    .locator(testSubj)
    .innerText()
    .catch(() => '');
  const parsed = Number.parseFloat(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : NaN;
};
