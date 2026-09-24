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
import { toMemoryDisplayTelemetry } from './page_store';
import { rankForMode, type RankedArm, type SampleBeta } from './ranking';
import { type MemoryPage } from '../../common/memory';

export const MEMORY_WORKSPACE_ROOT = '/workspace/memories';
export const MEMORY_INDEX_PATH = `${MEMORY_WORKSPACE_ROOT}/.index.json`;
export const MEMORY_KEEP_COUNT = 15;
export const MEMORY_INDEX_MAX_BYTES = 262_144;

export interface MemoryCatalogEntry {
  id: string;
  title: string;
  path: string;
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
    podReset: boolean;
    notificationChars: number;
  };
}

const README_CONTENT = `# Semantic Memories

Past investigation observations and learnings. Historical — independently verify
all claims against current data before relying on them.

The conversation catalog is \`.index.json\` (\`entries\` of \`id\`, \`title\`, \`path\`).
Read it with \`${SANDBOX_VIEW_FILE_TOOL_ID}\` or \`jq\`. This turn's new pages also
arrive in \`<system_update>\`. Open the page files with \`${SANDBOX_VIEW_FILE_TOOL_ID}\`.
This README is not a catalog. Do not edit these pages yourself — a parallel optimizer
evaluates useful pages after the run.
`;

const pagePath = (page: MemoryPage): string => `${MEMORY_WORKSPACE_ROOT}/${page.id}.md`;

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
      const row = entry as { id?: unknown; title?: unknown; path?: unknown };
      if (typeof row.id !== 'string' || row.id.length === 0) {
        return [];
      }
      if (typeof row.title !== 'string' || typeof row.path !== 'string') {
        return [];
      }
      return [{ id: row.id, title: row.title, path: row.path }];
    });
  } catch {
    return [];
  }
};

const readMemoryCatalog = async (session: SandboxSession): Promise<MemoryCatalogEntry[]> => {
  const [result] = await session.readFiles([
    { path: MEMORY_INDEX_PATH, maxReadBytes: MEMORY_INDEX_MAX_BYTES },
  ]);
  if (!result?.success) {
    return [];
  }
  return parseMemoryCatalog(result.content.toString('utf8'));
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

const renderPage = (page: MemoryPage, nowSec: number): string => {
  const display = toMemoryDisplayTelemetry(page, nowSec);
  const usefulnessPct = Math.round(display.conversionRate * 100);

  const header = [
    `---`,
    `title: ${page.title}`,
    `id: ${page.id}`,
    `status: ${page.status}`,
    `usefulness: ${usefulnessPct}%`,
    `impressions: ${Math.round(display.impressions)}x`,
    `confidence: ${display.confidence.toFixed(2)}`,
    `updated_at: ${page.updated_at}`,
    ...(page.description !== undefined ? [`description: ${page.description}`] : []),
    ...(page.source !== undefined ? [`source: ${JSON.stringify(page.source)}`] : []),
    ...(page.merged_from !== undefined && page.merged_from.length > 0
      ? [`merged_from: ${JSON.stringify(page.merged_from.join(', '))}`]
      : []),
    `---`,
    '',
    `# ${page.title}`,
    '',
  ];
  return `${header.join('\n')}${page.content.trim()}\n`;
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
  let candidates = await store.retrieve({
    query: trimmedQuery,
    size: retrieveSize,
  });

  // A short retry prompt like "try again" is a real user message, so the
  // workflow always forwards it as `query`. Strict title/content match then
  // returns nothing even when the catalog has pages. Fall back to browse so
  // hydrate still seeds the workspace.
  if (mode === 'search' && candidates.length === 0) {
    logger.info('Memory search matched 0 page(s) — falling back to browse');
    searchFallback = true;
    mode = 'browse';
    candidates = await store.retrieve({ size: keepCount * 10 });
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

  const priorById = new Map(priorCatalog.map((entry) => [entry.id, entry]));
  const carried: MemoryCatalogEntry[] = [];
  for (const entry of priorCatalog) {
    if (recalledIds.includes(entry.id)) {
      continue;
    }
    const existing = await store.get(entry.id);
    if (!existing || existing.status === 'archived') {
      continue;
    }
    carried.push(priorById.get(entry.id) ?? entry);
  }
  const entries: MemoryCatalogEntry[] = [
    ...carried,
    ...pages.map((page) => ({ id: page.id, title: page.title, path: pagePath(page) })),
  ];

  const newPages = pages.filter((page) => !alreadyOnDisk.has(pagePath(page)));
  const notification = formatHydrateNotification(
    'Semantic memories materialized this turn:',
    newPages.map((page) => ({ path: pagePath(page), title: page.title }))
  );

  await session.mkdirs([MEMORY_WORKSPACE_ROOT]);

  await session.writeFiles(
    pages.map((page) => ({
      path: pagePath(page),
      content: Buffer.from(renderPage(page, nowSec), 'utf8'),
    }))
  );

  await session.writeFiles([
    { path: `${MEMORY_WORKSPACE_ROOT}/README.md`, content: Buffer.from(README_CONTENT, 'utf8') },
    {
      path: MEMORY_INDEX_PATH,
      content: Buffer.from(JSON.stringify({ entries }), 'utf8'),
    },
  ]);
  logger.debug(
    `Memory materialize wrote ${pages.length} page file(s) plus README.md and .index.json (${entries.length} catalog); notification pages=${newPages.length}`
  );

  logger.info(
    recalledIds.length > 0
      ? `Materialized ${
          pages.length
        } Semantic Memory page(s) into the sandbox workspace (${mode}): ${recalledIds.join(', ')}`
      : `Materialized 0 Semantic Memory page(s) into the sandbox workspace (${mode})`
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
      podReset,
      notificationChars: notification.length,
    },
  };
};
