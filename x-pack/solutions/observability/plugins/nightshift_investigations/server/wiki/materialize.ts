/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuditedSandboxSession } from '../sandbox_audit';
import {
  WIKI_ENTITY_TYPE_BUCKETS,
  WIKI_ENTITY_TYPES,
  type WikiEntityType,
  type WikiPage,
  type WikiPageSummary,
} from '../../common/wiki';
import type { WikiTelemetry } from '../telemetry';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import type { WikiPageStore } from './page_store';

export const WIKI_WORKSPACE_ROOT = '/workspace/wiki';

const README_CONTENT = `# Knowledge Wiki

A living wiki of durable, cross-linked knowledge. Read these pages before investigating.

Start here, then open \`INDEX.md\` and follow links with \`${SANDBOX_VIEW_FILE_TOOL_ID}\`.
Do not write Wiki pages yourself — a post-run optimizer updates the wiki from this investigation.

Pages live under \`{type}/{slug}.md\`. Status is established, tentative, or archived.
\`ontology/\` pages describe how services and integrations relate; \`integrations/\` pages record how to query a system and how calls to it fail.
`;

const pagePath = (entityType: WikiEntityType, slug: string): string =>
  `${WIKI_WORKSPACE_ROOT}/${WIKI_ENTITY_TYPE_BUCKETS[entityType]}/${slug}.md`;

const renderIndex = (pages: WikiPageSummary[]): string => {
  const lines = [
    '# Wiki index',
    '',
    `Open a page with \`${SANDBOX_VIEW_FILE_TOOL_ID}\` using the path in parentheses.`,
    '',
  ];

  for (const entityType of WIKI_ENTITY_TYPES) {
    const bucketPages = pages.filter((page) => page.entity_type === entityType);
    if (bucketPages.length === 0) {
      continue;
    }
    lines.push(`## ${WIKI_ENTITY_TYPE_BUCKETS[entityType]}`);
    lines.push('');
    for (const page of bucketPages) {
      const path = pagePath(page.entity_type, page.id.replace(`wiki_${page.entity_type}_`, ''));
      lines.push(`- **${page.title}** (${page.status}, ${page.corroborations}x) — \`${path}\``);
    }
    lines.push('');
  }

  if (pages.length === 0) {
    lines.push('_No Wiki pages yet. Investigate first; the optimizer will propose pages._');
    lines.push('');
  }

  return lines.join('\n');
};

const renderPage = (page: WikiPage): string => {
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

export const materializeWiki = async ({
  session,
  store,
  telemetry,
  logger,
}: {
  session: AuditedSandboxSession;
  store: WikiPageStore;
  telemetry: WikiTelemetry;
  logger: Logger;
}): Promise<{ hydratedIds: string[] } | void> => {
  await store.pruneDuplicates();
  const { pages: allPages } = await store.list();
  // Archived means the optimizer retired the fact as stale, so materializing it would feed the
  // model knowledge we already decided not to trust.
  const pages = allPages.filter((page) => page.status !== 'archived');
  const fullPages = (await Promise.all(pages.map(async (summary) => store.get(summary.id)))).filter(
    (page): page is WikiPage => page !== undefined
  );

  await session.mkdirs([
    WIKI_WORKSPACE_ROOT,
    ...WIKI_ENTITY_TYPES.map(
      (entityType) => `${WIKI_WORKSPACE_ROOT}/${WIKI_ENTITY_TYPE_BUCKETS[entityType]}`
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
    { path: `${WIKI_WORKSPACE_ROOT}/README.md`, content: Buffer.from(README_CONTENT, 'utf8') },
    { path: `${WIKI_WORKSPACE_ROOT}/INDEX.md`, content: Buffer.from(renderIndex(pages), 'utf8') },
  ]);

  telemetry.reportHydrated(fullPages);
  logger.info(
    fullPages.length > 0
      ? `Materialized ${fullPages.length} Wiki page(s) into sandbox`
      : 'Materialized 0 Wiki page(s) into sandbox — store.list returned no live pages'
  );
  return { hydratedIds: fullPages.map((page) => page.id) };
};
