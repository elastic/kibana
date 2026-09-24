/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import {
  CORTEX_EDIT_ACTIONS,
  CORTEX_ENTITY_TYPES,
  type CortexEditAction,
  type CortexEntityType,
  type CortexPageStatus,
  type CortexPageSummary,
} from '../../common/cortex';
import type { AppliedCortexEdit, CortexTelemetry } from '../telemetry';
import { isReinforcementOwnedSlug } from '../../common/decision_trees';
import type { CortexPageStore } from './page_store';
import { canonicalizeSlug, slugFromCortexId, toCortexKiId } from './page_store';

const MAX_TRANSCRIPT_CHARS = 12_000;
const MAX_PROPOSALS = 8;

export interface CortexEditProposal {
  action: CortexEditAction;
  entity_type: CortexEntityType;
  slug: string;
  title: string;
  description?: string;
  content?: string;
  status?: Exclude<CortexPageStatus, 'archived'>;
}

export type ProposeCortexEdits = (input: {
  transcript: string;
  catalog: CortexPageSummary[];
}) => Promise<{ edits: CortexEditProposal[] }>;

const isEntityType = (value: unknown): value is CortexEntityType =>
  typeof value === 'string' && (CORTEX_ENTITY_TYPES as readonly string[]).includes(value);

const isAction = (value: unknown): value is CortexEditAction =>
  typeof value === 'string' && (CORTEX_EDIT_ACTIONS as readonly string[]).includes(value);

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/^(alert|postmortem|runbook|topic|service)\s*:\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const resolveSlug = (edit: CortexEditProposal, catalog: CortexPageSummary[]): string => {
  const canonical = canonicalizeSlug(edit.entity_type, edit.slug);
  const canonicalId = toCortexKiId(edit.entity_type, canonical);
  if (catalog.some((page) => page.id === canonicalId)) {
    return canonical;
  }

  const titleKey = normalizeTitle(edit.title);
  const match = catalog.find(
    (page) => page.entity_type === edit.entity_type && normalizeTitle(page.title) === titleKey
  );
  if (match) {
    return canonicalizeSlug(match.entity_type, slugFromCortexId(match.id, match.entity_type));
  }

  return canonical;
};

const normalizeProposal = (value: unknown): CortexEditProposal | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!isAction(record.action) || !isEntityType(record.entity_type)) {
    return undefined;
  }
  if (typeof record.slug !== 'string' || typeof record.title !== 'string') {
    return undefined;
  }
  const slug = normalizeSlug(record.slug);
  if (slug.length === 0) {
    return undefined;
  }

  const status =
    record.status === 'established' || record.status === 'tentative' ? record.status : undefined;

  return {
    action: record.action,
    entity_type: record.entity_type,
    slug,
    title: record.title.slice(0, 512),
    ...(typeof record.description === 'string'
      ? { description: record.description.slice(0, 2048) }
      : {}),
    ...(typeof record.content === 'string' ? { content: record.content.slice(0, 65536) } : {}),
    ...(status !== undefined ? { status } : {}),
  };
};

export const createLlmProposeCortexEdits = ({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): ProposeCortexEdits => {
  return async ({ transcript, catalog }) => {
    const catalogLines =
      catalog.length === 0
        ? '(empty)'
        : catalog
            .map((page) => {
              const slug = canonicalizeSlug(
                page.entity_type,
                slugFromCortexId(page.id, page.entity_type)
              );
              return `- slug=${slug} | ${page.entity_type} | ${page.status} | ${page.title} (${page.corroborations}x)`;
            })
            .join('\n');

    const response = await inferenceClient.output({
      id: 'nightshift_cortex_optimize',
      connectorId,
      system: `You maintain a team-wide wiki called Cortex. After an investigation, propose a small set of durable page edits.

Rules:
- Only propose facts that the transcript actually established. No speculation.
- Prefer corroborating an existing page over creating a near-duplicate.
- New pages use action "upsert" with markdown content. Keep content short and reusable.
- Use "corroborate" when the investigation confirms an existing page without changing it.
- A new page's slug names a recurring condition, never one occurrence of it. Never put a date, region, cloud, availability zone, cluster, node, or host in a new slug — those belong in the page content. "constructor-plan-failed-capacity" is a slug; "constructor-plan-failed-capacity-aws-us-east-1-2026-09-22" is not.
- When this investigation is another instance of a condition the catalog already documents, "corroborate" that page — and "upsert" the same slug when there is genuinely new detail to fold in — using its slug exactly as listed, even if that slug carries a date or region. Never open a second page for the same mechanism because the date, region, or cluster differs.
- Use "archive" only when the transcript shows a page is wrong or obsolete.
- entity_type must be one of: ${CORTEX_ENTITY_TYPES.join(', ')}.
- slug is a short kebab-case identifier. Reuse an existing page's slug exactly. Never prefix slug with "cortex", the entity type, or a document id.
- Propose at most ${MAX_PROPOSALS} edits. Return an empty list if nothing durable was learned.`,
      input: `Existing pages:\n${catalogLines}\n\nInvestigation transcript:\n${transcript}`,
      schema: {
        type: 'object',
        properties: {
          edits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: [...CORTEX_EDIT_ACTIONS] },
                entity_type: { type: 'string', enum: [...CORTEX_ENTITY_TYPES] },
                slug: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['established', 'tentative'] },
              },
              required: ['action', 'entity_type', 'slug', 'title'],
            },
          },
        },
        required: ['edits'],
      },
    });

    const rawEdits = Array.isArray(response.output?.edits) ? response.output.edits : [];
    return {
      edits: rawEdits
        .map(normalizeProposal)
        .filter((edit): edit is CortexEditProposal => edit !== undefined)
        .slice(0, MAX_PROPOSALS),
    };
  };
};

export const applyCortexEdits = async ({
  store,
  edits,
  telemetry,
  logger,
}: {
  store: CortexPageStore;
  edits: CortexEditProposal[];
  telemetry: CortexTelemetry;
  logger: Logger;
}): Promise<void> => {
  const { pages } = await store.list();
  const applied: AppliedCortexEdit[] = [];
  // Pages are mutated one at a time, so a failure part way through leaves the earlier edits
  // persisted. Reporting from `finally` keeps the counts honest for those partial runs.
  try {
    for (const edit of edits) {
      const slug = resolveSlug(edit, pages);
      // The reinforcement agent validates every write to its own pages against the Mermaid node
      // contract or the learning length budget. A free-form wiki edit would bypass those
      // guardrails.
      if (isReinforcementOwnedSlug(slug)) {
        logger.debug(`Skipped Cortex edit targeting reinforcement-owned page ${slug}`);
        continue;
      }
      const id = toCortexKiId(edit.entity_type, slug);
      if (edit.action === 'corroborate') {
        const updated = await store.corroborate(id);
        if (updated) {
          applied.push({ action: 'corroborate', entityType: edit.entity_type });
          logger.info(`Corroborated Cortex page ${id}`);
        }
        continue;
      }

      if (edit.action === 'archive') {
        const updated = await store.archive(id);
        if (updated) {
          applied.push({ action: 'archive', entityType: edit.entity_type });
          logger.info(`Archived Cortex page ${id}`);
        }
        continue;
      }

      const existing = await store.get(id);
      await store.upsert({
        entityType: edit.entity_type,
        slug,
        title: edit.title,
        description: edit.description ?? existing?.description,
        content: edit.content ?? existing?.content ?? '',
        // Same rule as corroborate: rewriting an archived page revives it as tentative, so a
        // proposal cannot promote a retired fact straight back to established.
        status:
          existing?.status === 'archived'
            ? 'tentative'
            : edit.status ?? existing?.status ?? 'tentative',
        corroborations: existing?.corroborations,
      });
      applied.push({ action: 'upsert', entityType: edit.entity_type });
      logger.info(`Upserted Cortex page ${id}`);
    }
  } finally {
    telemetry.reportEditsApplied(applied);
  }
};

export const optimizeCortex = async ({
  store,
  proposeEdits,
  userMessage,
  assistantMessage,
  telemetry,
  logger,
}: {
  store: CortexPageStore;
  proposeEdits: ProposeCortexEdits;
  userMessage: string;
  assistantMessage: string;
  telemetry: CortexTelemetry;
  logger: Logger;
}): Promise<void> => {
  await store.pruneDuplicates();
  const { pages: allPages } = await store.list();
  // Reinforcement-owned pages are kept out of the catalog so the model never proposes edits to them.
  const pages = allPages.filter(
    (page) => !isReinforcementOwnedSlug(slugFromCortexId(page.id, page.entity_type))
  );
  const transcript = [
    '## User',
    userMessage.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    '## Assistant',
    assistantMessage.slice(0, MAX_TRANSCRIPT_CHARS),
  ].join('\n');

  const { edits } = await proposeEdits({ transcript, catalog: pages });
  if (edits.length === 0) {
    logger.debug('Cortex optimizer proposed no edits');
    return;
  }

  await applyCortexEdits({ store, edits, telemetry, logger });
};
