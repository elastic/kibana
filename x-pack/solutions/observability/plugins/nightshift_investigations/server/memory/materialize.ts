/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { formatHydrateNotification } from '../lib/hydrate_notification';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { formatPageRefs, previewText } from './log_format';
import type { MemoryPageStore } from './page_store';
import {
  isCanonicalMemoryId,
  slugFromMemoryId,
  toMemoryDisplayTelemetry,
  toMemoryKiId,
} from './page_store';
import { rankForMode, type RankedArm, type SampleBeta } from './ranking';
import { type MemoryPage } from '../../common/memory';

export const MEMORY_WORKSPACE_ROOT = '/workspace/memories';
export const MEMORY_INDEX_PATH = `${MEMORY_WORKSPACE_ROOT}/.index.json`;
export const MEMORY_KEEP_COUNT = 15;
export const MEMORY_INDEX_MAX_BYTES = 1_048_576;
export const MEMORY_INDEX_MAX_ENTRIES = 10_000;

export const boundMemoryCatalog = (
  entries: readonly MemoryCatalogEntry[]
): { entries: MemoryCatalogEntry[]; evictedCount: number } => {
  const bounded = entries.slice(-MEMORY_INDEX_MAX_ENTRIES);
  while (Buffer.byteLength(JSON.stringify({ entries: bounded }), 'utf8') > MEMORY_INDEX_MAX_BYTES) {
    bounded.shift();
  }
  return { entries: bounded, evictedCount: entries.length - bounded.length };
};

export interface MemoryCatalogEntry {
  path: string;
  updated_at: string;
}

export interface MaterializeMemoryResult {
  recalledIds: string[];
  notification: string;
  summary: {
    retrievalMode: 'search' | 'browse';
    searchFallback: boolean;
    candidateCount: number;
    recalledCount: number;
    newPageCount: number;
    catalogSize: number;
    catalogEvictedCount: number;
    podReset: boolean;
    notificationChars: number;
  };
}

const README_CONTENT = `# Semantic Memories

Past investigation observations and learnings. Historical — independently verify
all claims against current data before relying on them.

Each file name names the memory. The conversation catalog is \`.index.json\`
(\`entries\` of \`path\`, \`updated_at\`). Read it with \`${SANDBOX_VIEW_FILE_TOOL_ID}\` or
\`jq\`. This turn's new pages also arrive in \`<system_update>\`. Open the page files with
\`${SANDBOX_VIEW_FILE_TOOL_ID}\`. This README is not a catalog. Do not edit these pages
yourself — a parallel optimizer evaluates useful pages after the run.
`;

const pagePath = (page: MemoryPage): string =>
  `${MEMORY_WORKSPACE_ROOT}/${slugFromMemoryId(page.id)}.md`;

/** Inverse of {@link pagePath}; undefined for paths no canonical memory id maps to. */
const memoryIdFromPath = (path: string): string | undefined => {
  const prefix = `${MEMORY_WORKSPACE_ROOT}/`;
  if (!path.startsWith(prefix) || !path.endsWith('.md')) {
    return undefined;
  }
  const id = toMemoryKiId(path.slice(prefix.length, -'.md'.length));
  return isCanonicalMemoryId(id) && path === `${prefix}${slugFromMemoryId(id)}.md` ? id : undefined;
};

const isCanonicalCatalogEntry = (entry: MemoryCatalogEntry): boolean =>
  memoryIdFromPath(entry.path) !== undefined;

export const parseMemoryCatalog = (raw: string): MemoryCatalogEntry[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('entries' in parsed)) {
      return [];
    }
    const entries = (parsed as { entries: unknown }).entries;
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return [];
      }
      const row = entry as { path?: unknown; updated_at?: unknown };
      if (typeof row.path !== 'string' || typeof row.updated_at !== 'string') {
        return [];
      }
      const catalogEntry = { path: row.path, updated_at: row.updated_at };
      return isCanonicalCatalogEntry(catalogEntry) ? [catalogEntry] : [];
    });
  } catch {
    return [];
  }
};

const readMemoryCatalog = async (session: SandboxSession): Promise<MemoryCatalogEntry[]> => {
  const [metadata] = await session.statFiles([MEMORY_INDEX_PATH]);
  if (!metadata?.exists) {
    return [];
  }
  if (metadata.is_dir) {
    throw new Error('Memory catalog path is a directory');
  }

  const [result] = await session.readFiles([
    { path: MEMORY_INDEX_PATH, maxReadBytes: MEMORY_INDEX_MAX_BYTES },
  ]);
  if (!result?.success) {
    throw new Error('Memory catalog exists but could not be read');
  }

  const raw = result.content.toString('utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Memory catalog is malformed or exceeds its read limit');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('entries' in parsed) ||
    !Array.isArray(parsed.entries)
  ) {
    throw new Error('Memory catalog has an invalid shape');
  }

  const catalog = parseMemoryCatalog(raw);
  if (catalog.length !== parsed.entries.length) {
    throw new Error('Memory catalog contains an invalid entry');
  }
  return catalog;
};

const existingFilePaths = async (
  session: SandboxSession,
  paths: string[]
): Promise<Set<string>> => {
  if (paths.length === 0) {
    return new Set();
  }
  const stats = await session.statFiles(paths);
  return new Set(stats.filter((stat) => stat.exists && !stat.is_dir).map((stat) => stat.path));
};

// Ranking, counters, status, and provenance belong to the memory system; the agent only reads
// the fact itself, named by its file.
const renderPage = (page: MemoryPage): string => `${page.content.trim()}\n`;

const toUpdatedDate = (iso: string): string => iso.slice(0, 10);

const assertMkdirResults = (results: boolean[], expectedCount: number): void => {
  if (results.length !== expectedCount || results.some((success) => !success)) {
    throw new Error('Memory materialization failed to create the workspace directory');
  }
};

const assertWriteResults = (
  results: Array<{ success: boolean }>,
  expectedCount: number,
  description: string
): void => {
  if (results.length !== expectedCount || results.some(({ success }) => !success)) {
    throw new Error(`Memory materialization failed to write ${description}`);
  }
};

export const materializeMemory = async ({
  session,
  store,
  logger,
  query,
  sampleBeta,
  now = () => Date.now() / 1000,
  keepCount = MEMORY_KEEP_COUNT,
}: {
  session: SandboxSession;
  store: MemoryPageStore;
  logger: Logger;
  query?: string;
  sampleBeta?: SampleBeta;
  now?: () => number;
  keepCount?: number;
}): Promise<MaterializeMemoryResult> => {
  const trimmedQuery = query?.trim();
  let mode: 'search' | 'browse' = trimmedQuery ? 'search' : 'browse';
  let searchFallback = false;
  const retrieveSize = mode === 'search' ? 50 : keepCount * 10;
  logger.debug(
    `Memory materialize start mode=${mode} keepCount=${keepCount} retrieveSize=${retrieveSize} ` +
      `queryChars=${trimmedQuery?.length ?? 0} query=${JSON.stringify(previewText(trimmedQuery))}`
  );
  let candidates = (
    await store.retrieve({
      query: trimmedQuery,
      size: retrieveSize,
    })
  ).filter((page) => isCanonicalMemoryId(page.id));

  // A short retry prompt like "try again" is a real user message, so the
  // workflow always forwards it as `query`. Strict title/content match then
  // returns nothing even when the catalog has pages. Fall back to browse so
  // hydrate still seeds the workspace.
  if (mode === 'search' && candidates.length === 0) {
    logger.info('Memory search matched 0 page(s) — falling back to browse');
    searchFallback = true;
    mode = 'browse';
    candidates = (await store.retrieve({ size: keepCount * 10 })).filter((page) =>
      isCanonicalMemoryId(page.id)
    );
  } else if (mode === 'search') {
    logger.info(`Memory search matched ${candidates.length} page(s)`);
  } else {
    logger.info(`Memory browse loaded ${candidates.length} page(s)`);
  }

  const nowSec = now();
  const states: Record<string, Pick<RankedArm, 'impressions' | 'conversions'>> = {};
  for (const page of candidates) {
    const display = toMemoryDisplayTelemetry(page, nowSec);
    states[page.id] = { impressions: display.impressions, conversions: display.conversions };
  }
  logger.debug(
    `Memory materialize candidates (${mode}, ${candidates.length}): ` +
      (candidates.length === 0
        ? '(none)'
        : candidates
            .map((page) => {
              const display = toMemoryDisplayTelemetry(page, nowSec);
              return (
                `${page.id} cr=${display.conversionRate.toFixed(2)} ` +
                `imp=${display.impressions.toFixed(2)} conf=${display.confidence.toFixed(2)} ` +
                `ctx=${JSON.stringify(previewText(page.context, 80))}`
              );
            })
            .join(' | '))
  );

  const rankedIds = rankForMode({
    mode,
    ids: candidates.map((page) => page.id),
    states,
    browseRanker: 'thompson',
    sampleBeta,
  });
  logger.debug(
    `Memory materialize ranker=${mode === 'search' ? 'passthrough' : 'thompson'} ` +
      `ranked=${rankedIds.join(', ') || '(none)'}`
  );

  const byId = new Map(candidates.map((page) => [page.id, page]));
  const pages = rankedIds
    .slice(0, keepCount)
    .map((id) => byId.get(id))
    .filter((page): page is MemoryPage => page !== undefined);
  const recalledIds = pages.map((page) => page.id);
  logger.debug(
    `Memory materialize keep ${recalledIds.length}/${candidates.length}: ${formatPageRefs(pages)}`
  );

  // Pod eviction clears /workspace. Read the catalog and existing paths before
  // any write, which clears session.isReset.
  const podReset = session.isReset;
  const priorCatalog = podReset ? [] : await readMemoryCatalog(session);
  const keepPaths = pages.map(pagePath);
  const alreadyOnDisk = podReset ? new Set<string>() : await existingFilePaths(session, keepPaths);

  const carried: MemoryCatalogEntry[] = [];
  const carriedPaths = new Set<string>();
  const keepPathSet = new Set(keepPaths);
  for (const entry of priorCatalog) {
    const id = memoryIdFromPath(entry.path);
    if (!id || keepPathSet.has(entry.path) || carriedPaths.has(entry.path)) {
      continue;
    }
    const existing = await store.get(id);
    if (!existing || existing.archived) {
      continue;
    }
    carriedPaths.add(entry.path);
    carried.push(entry);
  }
  const allEntries: MemoryCatalogEntry[] = [
    ...carried,
    ...pages.map((page) => ({ path: pagePath(page), updated_at: page.updated_at })),
  ];
  const { entries, evictedCount: catalogEvictedCount } = boundMemoryCatalog(allEntries);
  if (catalogEvictedCount > 0) {
    logger.warn(
      `Semantic Memory catalog reached its boundary; evicted ${catalogEvictedCount} oldest ` +
        `entry(s) (maxEntries=${MEMORY_INDEX_MAX_ENTRIES}, maxBytes=${MEMORY_INDEX_MAX_BYTES})`
    );
  }

  const newPages = pages.filter((page) => !alreadyOnDisk.has(pagePath(page)));
  const notification = formatHydrateNotification(
    'Potentially relevant memories retrieved this turn:',
    newPages.map((page) => ({
      path: pagePath(page),
      detail: `updated ${toUpdatedDate(page.updated_at)}`,
    }))
  );

  const mkdirResults = await session.mkdirs([MEMORY_WORKSPACE_ROOT]);
  assertMkdirResults(mkdirResults, 1);

  const pageWriteResults = await session.writeFiles(
    pages.map((page) => ({
      path: pagePath(page),
      content: Buffer.from(renderPage(page), 'utf8'),
    }))
  );
  assertWriteResults(pageWriteResults, pages.length, 'memory page files');

  const catalogFiles = [
    { path: `${MEMORY_WORKSPACE_ROOT}/README.md`, content: Buffer.from(README_CONTENT, 'utf8') },
    {
      path: MEMORY_INDEX_PATH,
      content: Buffer.from(JSON.stringify({ entries }), 'utf8'),
    },
  ];
  const catalogWriteResults = await session.writeFiles(catalogFiles);
  assertWriteResults(catalogWriteResults, catalogFiles.length, 'memory catalog files');
  logger.debug(
    `Memory materialize wrote ${pages.length} page file(s) plus README.md and .index.json (${entries.length} catalog); notification pages=${newPages.length}`
  );

  logger.info(
    `Materialized ${pages.length} Semantic Memory page(s) into the sandbox workspace (${mode})`
  );
  return {
    recalledIds,
    notification,
    summary: {
      retrievalMode: mode,
      searchFallback,
      candidateCount: candidates.length,
      recalledCount: recalledIds.length,
      newPageCount: newPages.length,
      catalogSize: entries.length,
      catalogEvictedCount,
      podReset,
      notificationChars: notification.length,
    },
  };
};
