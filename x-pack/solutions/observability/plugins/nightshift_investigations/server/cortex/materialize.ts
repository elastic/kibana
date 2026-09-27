/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import {
  CORTEX_ENTITY_TYPE_BUCKETS,
  CORTEX_ENTITY_TYPES,
  type CortexEntityType,
  type CortexPage,
  type CortexPageSummary,
} from '../../common/cortex';
import type { CortexTelemetry } from '../telemetry';
import type { CortexPageStore } from './page_store';

export const CORTEX_WORKSPACE_ROOT = '/workspace/cortex';

const README_CONTENT = `# Knowledge Cortex

A living wiki of durable, cross-linked knowledge. Read these pages before investigating.

Start here, then open \`INDEX.md\` and follow links with \`nightshift_sandbox_view_file\`.
Do not write Cortex pages yourself — a post-run optimizer updates the wiki from this investigation.

Pages live under \`{type}/{slug}.md\`. Status is established, tentative, or archived.
`;

const pagePath = (entityType: CortexEntityType, slug: string): string =>
  `${CORTEX_WORKSPACE_ROOT}/${CORTEX_ENTITY_TYPE_BUCKETS[entityType]}/${slug}.md`;

const renderIndex = (pages: CortexPageSummary[]): string => {
  const lines = [
    '# Cortex index',
    '',
    'Open a page with `nightshift_sandbox_view_file` using the path in parentheses.',
    '',
  ];

  for (const entityType of CORTEX_ENTITY_TYPES) {
    const bucketPages = pages.filter((page) => page.entity_type === entityType);
    if (bucketPages.length === 0) {
      continue;
    }
    lines.push(`## ${CORTEX_ENTITY_TYPE_BUCKETS[entityType]}`);
    lines.push('');
    for (const page of bucketPages) {
      const path = pagePath(page.entity_type, page.id.replace(`cortex_${page.entity_type}_`, ''));
      lines.push(`- **${page.title}** (${page.status}, ${page.corroborations}x) — \`${path}\``);
    }
    lines.push('');
  }

  if (pages.length === 0) {
    lines.push('_No Cortex pages yet. Investigate first; the optimizer will propose pages._');
    lines.push('');
  }

  return lines.join('\n');
};

const renderPage = (page: CortexPage): string => {
  const header = [
    `---`,
    `title: ${page.title}`,
    `type: ${page.entity_type}`,
    `status: ${page.status}`,
    `corroborations: ${page.corroborations}`,
    `updated_at: ${page.updated_at}`,
    ...(page.description !== undefined ? [`description: ${page.description}`] : []),
    `---`,
    '',
    `# ${page.title}`,
    '',
  ];
  return `${header.join('\n')}${page.content.trim()}\n`;
};

export const materializeCortex = async ({
  session,
  store,
  telemetry,
  logger,
}: {
  session: SandboxSession;
  store: CortexPageStore;
  telemetry: CortexTelemetry;
  logger: Logger;
}): Promise<void> => {
  await store.pruneDuplicates();
  const { pages: allPages } = await store.list();
  // Archived means the optimizer retired the fact as stale, so materializing it would feed the
  // model knowledge we already decided not to trust.
  const pages = allPages.filter((page) => page.status !== 'archived');
  const fullPages = (await Promise.all(pages.map(async (summary) => store.get(summary.id)))).filter(
    (page): page is CortexPage => page !== undefined
  );

  await session.mkdirs([
    CORTEX_WORKSPACE_ROOT,
    ...CORTEX_ENTITY_TYPES.map(
      (entityType) => `${CORTEX_WORKSPACE_ROOT}/${CORTEX_ENTITY_TYPE_BUCKETS[entityType]}`
    ),
  ]);

  // The sandbox has no rename, so this cannot be an atomic swap. Writing the pages first means a
  // failure part-way leaves the index missing rather than listing pages that were never written —
  // the agent then reads nothing instead of following links into empty files.
  await session.writeFiles(
    fullPages.map((page) => ({
      path: pagePath(page.entity_type, page.slug),
      content: Buffer.from(renderPage(page), 'utf8'),
    }))
  );
  await session.writeFiles([
    { path: `${CORTEX_WORKSPACE_ROOT}/README.md`, content: Buffer.from(README_CONTENT, 'utf8') },
    { path: `${CORTEX_WORKSPACE_ROOT}/INDEX.md`, content: Buffer.from(renderIndex(pages), 'utf8') },
  ]);

  telemetry.reportHydrated(fullPages);
  logger.info(`Materialized ${fullPages.length} Cortex page(s) into sandbox`);
};
