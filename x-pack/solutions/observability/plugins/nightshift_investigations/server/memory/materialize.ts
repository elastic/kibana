/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxApiClient } from '../tools/sandbox_bash/grpc_client';
import type { MemoryPageStore } from './page_store';
import { toMemoryDisplayTelemetry } from './page_store';
import { rankForMode, type RankedArm, type SampleBeta } from './ranking';
import { type MemoryPage } from '../../common/memory';

export const MEMORY_WORKSPACE_ROOT = '/workspace/memories';
export const MEMORY_RECALLED_PATH = `${MEMORY_WORKSPACE_ROOT}/.recalled.json`;
export const MEMORY_KEEP_COUNT = 15;
export const MEMORY_RECALLED_MAX_BYTES = 65_536;

export const parseRecalledSidecar = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('ids' in parsed)) {
      return [];
    }
    const ids = (parsed as { ids: unknown }).ids;
    if (!Array.isArray(ids)) {
      return [];
    }
    return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
};

export const readRecalledIds = async ({
  apiClient,
  conversationId,
}: {
  apiClient: SandboxApiClient;
  conversationId: string;
}): Promise<string[]> => {
  const [result] = await apiClient.readFiles(conversationId, [
    { path: MEMORY_RECALLED_PATH, maxReadBytes: MEMORY_RECALLED_MAX_BYTES },
  ]);
  if (!result?.success) {
    return [];
  }
  return parseRecalledSidecar(result.content.toString('utf8'));
};

const README_CONTENT = `# Semantic Memories

Past investigation observations and learnings. Read relevant files at the start of
every investigation to find prior context.

Start here, then open \`INDEX.md\` and read pages with \`nightshift_sandbox_view_file\`.
Memories are historical observations — independently verify all claims against current
data before relying on them. Do not edit these pages yourself — a parallel optimizer
evaluates useful pages after the run.
`;

const pagePath = (page: MemoryPage): string => `${MEMORY_WORKSPACE_ROOT}/${page.id}.md`;

const renderIndex = (pages: MemoryPage[], nowSec: number): string => {
  const lines = [
    '# Memory index',
    '',
    'Open a page with `nightshift_sandbox_view_file` using the path in parentheses.',
    'This is the ranked recall set for this round, not the full wiki.',
    '',
  ];

  for (const page of pages) {
    const display = toMemoryDisplayTelemetry(page, nowSec);
    const usefulnessPct = Math.round(display.conversionRate * 100);
    lines.push(
      `- **${page.title}** (Useful: ${usefulnessPct}%, Impressions: ${Math.round(
        display.impressions
      )}x) — \`${pagePath(page)}\``
    );
  }

  if (pages.length === 0) {
    lines.push('_No Semantic Memories recalled for this round._');
    lines.push('');
  }

  return lines.join('\n');
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
    `---`,
    '',
    `# ${page.title}`,
    '',
  ];
  return `${header.join('\n')}${page.content.trim()}\n`;
};

export const materializeMemory = async ({
  apiClient,
  conversationId,
  store,
  logger,
  query,
  sampleBeta,
  now = () => Date.now() / 1000,
  keepCount = MEMORY_KEEP_COUNT,
}: {
  apiClient: SandboxApiClient;
  conversationId: string;
  store: MemoryPageStore;
  logger: Logger;
  query?: string;
  sampleBeta?: SampleBeta;
  now?: () => number;
  keepCount?: number;
}): Promise<string[]> => {
  const trimmedQuery = query?.trim();
  const mode = trimmedQuery ? 'search' : 'browse';
  const candidates = await store.retrieve({
    query: trimmedQuery,
    size: mode === 'search' ? 50 : keepCount * 10,
  });

  const nowSec = now();
  const states: Record<string, Pick<RankedArm, 'impressions' | 'conversions'>> = {};
  for (const page of candidates) {
    const display = toMemoryDisplayTelemetry(page, nowSec);
    states[page.id] = { impressions: display.impressions, conversions: display.conversions };
  }

  const rankedIds = rankForMode({
    mode,
    ids: candidates.map((page) => page.id),
    states,
    browseRanker: 'thompson',
    sampleBeta,
  });

  const byId = new Map(candidates.map((page) => [page.id, page]));
  const pages = rankedIds
    .slice(0, keepCount)
    .map((id) => byId.get(id))
    .filter((page): page is MemoryPage => page !== undefined);
  const recalledIds = pages.map((page) => page.id);

  await apiClient.mkdirs(conversationId, [MEMORY_WORKSPACE_ROOT]);

  await apiClient.writeFiles(
    conversationId,
    pages.map((page) => ({
      path: pagePath(page),
      content: Buffer.from(renderPage(page, nowSec), 'utf8'),
    }))
  );

  await apiClient.writeFiles(conversationId, [
    { path: `${MEMORY_WORKSPACE_ROOT}/README.md`, content: Buffer.from(README_CONTENT, 'utf8') },
    {
      path: `${MEMORY_WORKSPACE_ROOT}/INDEX.md`,
      content: Buffer.from(renderIndex(pages, nowSec), 'utf8'),
    },
    {
      path: MEMORY_RECALLED_PATH,
      content: Buffer.from(JSON.stringify({ ids: recalledIds }), 'utf8'),
    },
  ]);

  logger.info(
    `Materialized ${pages.length} Semantic Memory page(s) into sandbox conversation ${conversationId}`
  );
  return recalledIds;
};
