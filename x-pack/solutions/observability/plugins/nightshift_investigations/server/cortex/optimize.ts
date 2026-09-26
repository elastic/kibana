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
  type CortexPageSummary,
} from '../../common/cortex';
import type { AppliedCortexEdit, CortexTelemetry } from '../telemetry';
import { isReinforcementOwnedSlug } from '../../common/decision_trees';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import type { CortexPageStore } from './page_store';
import {
  canonicalizeSlug,
  slugFromCortexId,
  statusAfterCorroboration,
  toCortexKiId,
} from './page_store';

const MAX_TRANSCRIPT_CHARS = 12_000;
const MAX_TOOL_CALLS_CHARS = 12_000;
const MAX_TOOL_CALL_PARAMS_CHARS = 1_000;
const MAX_PROPOSALS = 8;

export interface CortexEditProposal {
  action: CortexEditAction;
  entity_type: CortexEntityType;
  slug: string;
  title: string;
  description?: string;
  content?: string;
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

  return {
    action: record.action,
    entity_type: record.entity_type,
    slug,
    title: record.title.slice(0, 512),
    ...(typeof record.description === 'string'
      ? { description: record.description.slice(0, 2048) }
      : {}),
    ...(typeof record.content === 'string' ? { content: record.content.slice(0, 65536) } : {}),
  };
};

/** Renders tool calls as one line each, dropping the tail once the transcript budget is spent. */
export const renderToolCalls = (toolCalls: InvestigationToolCall[]): string => {
  const lines: string[] = [];
  let used = 0;
  for (const { tool_id: toolId, params } of toolCalls) {
    const line = `- ${toolId ?? 'unknown'} ${JSON.stringify(params ?? {}).slice(
      0,
      MAX_TOOL_CALL_PARAMS_CHARS
    )}`;
    if (used + line.length > MAX_TOOL_CALLS_CHARS) {
      lines.push(`- (${toolCalls.length - lines.length} more tool calls omitted)`);
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines.length === 0 ? '(none)' : lines.join('\n');
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

The wiki is read before every future task — investigations, alert triage, questions — so capture facts that help any of them understand the system faster, not only facts that would solve this exact investigation again.

What each entity type holds (use these markdown sections; skip ones that would be empty):
- integration — one page per connector, data source, or external system the investigator reads from (an Elasticsearch cluster, a cross-cluster search remote, Kubernetes, GitHub, …). This includes the telemetry cluster the investigator queries: its index patterns, field conventions and quirks, and query pitfalls belong on its integration page, not on a service page. Sections: ## Overview, ## Access, ## Capabilities, ## Common pitfalls.
- service — one page per logical or deployable service: what it does, what it depends on, where its logs, metrics, and traces live, and how it fails. Sections: ## Overview, ## Dependencies, ## Telemetry, ## Failure modes.
- alert — one page per alert rule. Sections: ## Symptom, ## Likely causes, ## First-look checks.
- runbook — a symptom-triggered playbook; many alerts can share one. Sections: ## Trigger, ## Investigation steps, ## Resolution.
- query — a reusable ES|QL or DSL query. Sections: ## Purpose, ## Query (fenced code block), ## Notes.
- dashboard — a canonical dashboard. Sections: ## URL, ## What it shows.
- postmortem — one page per incident mechanism; a later firing of the same mechanism corroborates it. Sections: ## Incident summary, ## Root cause, ## Detection signals, ## Remediation.
- topic — cross-cutting concepts that fit no other type. Sections: ## Overview, ## Established facts, ## Open questions.
- glossary — a one-paragraph definition of a term or acronym.

Services and integrations:
- When the transcript establishes a durable fact about a service or an integration — what it does, what it depends on, which indices or fields hold its telemetry, how to query it, how it fails — record it on that service or integration page, not only inside a postmortem, alert, or topic. Create the page when the catalog has none.
- The tool calls show what the investigator ran, with parameters but without results. Use them to learn which services, indices, and integrations were queried and how. Treat a fact as established only when the assistant's answer confirms it.

Rules:
- Only propose facts that the transcript actually established. No speculation.
- Never include credentials, tokens, API keys, or personal data.
- Keep single-run details — timestamps, alert ids, counts, uptime values — out of page content. Distil them into reusable claims.
- Prefer corroborating an existing page over creating a near-duplicate.
- New pages use action "upsert" with markdown content. Keep content short and reusable.
- Use "corroborate" when the investigation confirms an existing page without changing it.
- A slug names a recurring condition, never one occurrence of it. Never put a date, region, cloud, availability zone, cluster, node, or host in a slug — those belong in the page content. "constructor-plan-failed-capacity" is a slug; "constructor-plan-failed-capacity-aws-us-east-1-2026-09-22" is not.
- When this investigation is another instance of a condition the catalog already documents, "corroborate" that page — and "upsert" the same slug when there is genuinely new detail to fold in. Never open a second page for the same mechanism because the date, region, or cluster differs.
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
  // A run confirms a page at most once, and never one it created: promotion needs a confirmation
  // from a later run.
  const touchedIds = new Set<string>();
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
        if (touchedIds.has(id)) {
          continue;
        }
        const updated = await store.corroborate(id);
        if (updated) {
          touchedIds.add(id);
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
      // Rewriting a live page means this run re-established it, so it counts as a corroboration.
      // New pages start tentative, and rewriting an archived page revives it as tentative, so a
      // single run can never publish a fact as established.
      const confirms =
        existing !== undefined && existing.status !== 'archived' && !touchedIds.has(id);
      const corroborations = confirms ? existing.corroborations + 1 : existing?.corroborations;
      touchedIds.add(id);
      await store.upsert({
        entityType: edit.entity_type,
        slug,
        title: edit.title,
        description: edit.description ?? existing?.description,
        content: edit.content ?? existing?.content ?? '',
        status: existing
          ? statusAfterCorroboration(existing.status, corroborations ?? 0)
          : 'tentative',
        corroborations,
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
  toolCalls,
  telemetry,
  logger,
}: {
  store: CortexPageStore;
  proposeEdits: ProposeCortexEdits;
  userMessage: string;
  assistantMessage: string;
  toolCalls: InvestigationToolCall[];
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
    '## Tool calls (parameters only)',
    renderToolCalls(toolCalls),
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
