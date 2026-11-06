/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  CORTEX_EDIT_ACTIONS,
  CORTEX_ENTITY_TYPES,
  CORTEX_SECTIONS_BY_TYPE,
  type CortexEditAction,
  type CortexEntityType,
  type CortexPageSummary,
  type CortexRoundKind,
} from '../../common/cortex';
import { CORTEX_RELATION_KINDS, tidyCortexOntology } from '../../common/cortex_relations';
import type { AppliedCortexEdit, CortexTelemetry } from '../telemetry';
import { isReinforcementOwnedSlug } from '../../common/decision_trees';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import {
  isSeededWorkspaceAccess,
  type AppliedWriteRecord,
  type WriteProvenance,
} from '../investigation_round';
import { dropEmptySections } from './drop_empty_sections';
import { lintCortexContent } from './lint_content';
import type { CortexPageStore } from './page_store';
import {
  canonicalizeSlug,
  slugFromCortexId,
  statusAfterCorroboration,
  toCortexKiId,
} from './page_store';

const MAX_TRANSCRIPT_CHARS = 12_000;
const MAX_TOOL_CALLS_CHARS = 32_000;
const MAX_TOOL_CALL_PARAMS_CHARS = 1_000;
const MAX_TOOL_CALL_RESULT_CHARS = 2_000;
const MAX_TOOL_CALL_PARAM_ARRAY_ITEMS = 20;
const MAX_PROPOSALS = 8;
const MAX_PAGE_BODIES = 8;
const MAX_PAGE_BODY_CHARS = 3_000;
/** A shorter slug would match unrelated words in the transcript. */
const MIN_SLUG_CHARS_TO_MATCH = 4;

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
  /** The conversation being learned from, so the catalog can mark the pages it wrote. */
  currentConversationId?: string;
  /**
   * Content of the pages the round is likely to rewrite or judge: the ones this conversation wrote
   * and the ones the transcript names. The model only knows what it is shown, so a rewrite of a page
   * it never saw would drop what the page already holds.
   */
  pageBodies?: Array<{ slug: string; entity_type: CortexEntityType; content: string }>;
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

// Params can carry multi-megabyte values (e.g. file contents), so long strings and arrays are cut
// while serializing rather than after.
const boundToolCallParam = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.slice(0, MAX_TOOL_CALL_PARAMS_CHARS);
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_TOOL_CALL_PARAM_ARRAY_ITEMS);
  }
  return value;
};

const boundToolCallResult = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.slice(0, MAX_TOOL_CALL_RESULT_CHARS);
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_TOOL_CALL_PARAM_ARRAY_ITEMS);
  }
  return value;
};

/** True when the call reads back a workspace file Nightshift seeded itself. */
export const isSeededWorkspaceRead = ({
  tool_id: toolId,
  params,
}: InvestigationToolCall): boolean => isSeededWorkspaceAccess(toolId, params);

const renderToolResultValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value, boundToolCallResult) ?? '';

// Top-level string fields (e.g. `stdout`) are rendered raw so command output isn't JSON-escaped.
const renderToolResultData = (data: unknown): string => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return renderToolResultValue(data);
  }
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${renderToolResultValue(value)}`)
    .join('\n');
};

// A result Agent Builder typed as an error is marked, so the model can tell a failed call from one
// that returned data and learn how the call failed.
const renderToolCallResult = (result: unknown): string => {
  const isObject = typeof result === 'object' && result !== null;
  const rendered = renderToolResultData(isObject && 'data' in result ? result.data : result);
  return isObject && (result as { type?: unknown }).type === 'error'
    ? `error: ${rendered}`
    : rendered;
};

const renderToolCallResults = (results: unknown[]): string =>
  results.map(renderToolCallResult).join('\n').slice(0, MAX_TOOL_CALL_RESULT_CHARS);

/**
 * Renders tool calls one per line, followed by a bounded result line when the call's results are
 * known, dropping the tail once the transcript budget is spent.
 */
export const renderToolCalls = (toolCalls: InvestigationToolCall[]): string => {
  const lines: string[] = [];
  let used = 0;
  for (const call of toolCalls) {
    const { tool_id: toolId, params, results } = call;
    const callLine = `- ${toolId ?? 'unknown'} ${JSON.stringify(
      params ?? {},
      boundToolCallParam
    ).slice(0, MAX_TOOL_CALL_PARAMS_CHARS)}`;
    const line =
      results && !isSeededWorkspaceRead(call)
        ? `${callLine}\n  result: ${renderToolCallResults(results)}`
        : callLine;
    if (used + line.length > MAX_TOOL_CALLS_CHARS) {
      lines.push(`- (${toolCalls.length - lines.length} more tool calls omitted)`);
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines.length === 0 ? '(none)' : lines.join('\n');
};

const ENTITY_TYPE_GUIDE: Record<CortexEntityType, string> = {
  integration:
    'one page per connector, data source, or external system the investigator reads from (an Elasticsearch cluster, a cross-cluster search remote, Kubernetes, GitHub, …). This includes the telemetry cluster the investigator queries: its index patterns and field conventions belong on its integration page, not on a service page. Query conventions records how to query it: stream and index naming, the fields that hold versions, images and deploys, and filters that work. Tool failures records the recurring ways calls to it fail.',
  service:
    'one page per logical or deployable service: what it does, what it depends on (name the upstream and downstream components), where its logs, metrics, and traces live (streams, fields, event and node sources, restart and termination state), and how it fails.',
  alert:
    'one page per alert rule. First-look checks name the dependencies and neighbouring components to check, where version and deploy changes show, and where restart and termination state lives, not only the component that raised the symptom.',
  runbook: 'a symptom-triggered playbook; many alerts can share one.',
  query: 'a reusable ES|QL or DSL query; put the query in a fenced code block under ## Query.',
  dashboard: 'a canonical dashboard.',
  postmortem:
    'one page per incident mechanism; a later firing of the same mechanism corroborates it.',
  topic: 'cross-cutting concepts that fit no other type.',
  glossary: 'a one-paragraph definition of a term or acronym.',
  ontology: `how services and integrations relate, one page per domain or area (for example one product flow). Nodes lists each component by the name its own page uses. Relations is a fenced block with one edge per line, \`source -> target : kind\`, where kind is one of ${CORTEX_RELATION_KINDS.join(
    ', '
  )}. Concepts defines terms the components share.`,
};

// Generated from the shared section list so the sections the model is asked for are the ones the
// page checks and the UI read.
const ENTITY_TYPE_GUIDE_LINES = CORTEX_ENTITY_TYPES.map((entityType) => {
  const sections = CORTEX_SECTIONS_BY_TYPE[entityType];
  const sectionList =
    sections.length > 0
      ? ` Sections: ${sections.map((section) => `## ${section}`).join(', ')}.`
      : '';
  return `- ${entityType} — ${ENTITY_TYPE_GUIDE[entityType]}${sectionList}`;
}).join('\n');

export const createLlmProposeCortexEdits = ({
  inferenceClient,
}: {
  inferenceClient: BoundInferenceClient;
}): ProposeCortexEdits => {
  return async ({ transcript, catalog, currentConversationId, pageBodies = [] }) => {
    const catalogLines =
      catalog.length === 0
        ? '(empty)'
        : catalog
            .map((page) => {
              const slug = canonicalizeSlug(
                page.entity_type,
                slugFromCortexId(page.id, page.entity_type)
              );
              const fromThisInvestigation =
                currentConversationId !== undefined &&
                page.authored_by?.includes(currentConversationId)
                  ? ' [this investigation]'
                  : '';
              return `- slug=${slug} | ${page.entity_type} | ${page.status} | ${page.title} (${page.corroborations}x)${fromThisInvestigation}`;
            })
            .join('\n');

    const pageBodyLines = pageBodies
      .map(
        ({ slug, entity_type: entityType, content }) =>
          `### ${entityType}/${slug}\n${content.slice(0, MAX_PAGE_BODY_CHARS)}`
      )
      .join('\n\n');

    const response = await inferenceClient.output({
      id: 'nightshift_cortex_optimize',
      system: `You maintain a team-wide wiki called Cortex. After a round of work, propose a small set of durable page edits.

The wiki is read before every future task — investigations, alert triage, questions — so capture facts that help any of them understand the system faster, not only facts that would solve this exact investigation again.

What each entity type holds (use these markdown sections; skip ones that would be empty):
${ENTITY_TYPE_GUIDE_LINES}

Durable knowledge only:
- Write what stays true while the system stays the same: how components depend on each other, where their telemetry lives, which queries work and which fail, and what to check for a kind of symptom. A page never records the outcome of one incident.
- Keep single-run details out of page content: timestamps, alert ids, counts, durations, and the cause of one incident stated as if it were a general rule. Distil them into reusable claims, such as "when X slows down, check Y".
- A page with a date, a time or an id is rejected, so such an edit is lost. Counts of events seen in one run ("5,944 errors", "23 restarts") and words like "currently" or "recently" go stale as well: write the pattern instead ("restarts repeatedly"). Do not give the number of pods, replicas, nodes or instances either: write "several" or "one per zone". Limits that are configured ("gives up after 3 retries"), HTTP status codes ("403 errors on registration"), quoted error messages, component names and field names are fine.
- Name components, streams, indices and fields exactly as the transcript shows them.

What this round is:
The transcript opens with a "## Round" line that says which kind of round it is.
- initial — an investigation. Learn the durable structure and tool behaviour it established.
- follow_up — the user's turn follows an earlier answer, shown under "## Previous answer". It may correct that answer or point at something it missed. A correction from a person outranks a single investigation: turn it into durable knowledge — what to check for this kind of symptom, where it lives (only streams, indices, fields or components that appear in the user's text or the tool calls), and how components relate — and put it under the right type and section. If it shows that an existing page is wrong, rewrite or archive that page.
- alert_recovery — the round checks whether an alert's recovery confirms or refutes the investigation's root cause, shown under "## Previous answer". Pages marked [this investigation] in the catalog were written by that investigation, and their content follows the catalog under "Existing page content". When the assistant's answer says the cause was confirmed, corroborate the pages that state it with a "corroborate" edit, also when you rewrite the same page to add detail the recovery established: a rewrite alone does not confirm a page, so propose both edits. When it says the cause was contradicted, rewrite or archive the claims the recovery contradicts, and never add the refuted cause to any page. When it says the cause is only partly supported or unresolved, change nothing.

Services and integrations:
- When the transcript establishes a durable fact about a service or an integration — what it does, what it depends on, which indices or fields hold its telemetry, how to query it, how it fails — record it on that service or integration page, not only inside a postmortem, alert, or topic. Create the page when the catalog has none.
- The tool calls show what the investigator ran and, on the "result:" line under a call, a truncated excerpt of what it returned; a result marked "error:" failed. Use them to learn which services, indices, and integrations were queried, how, and what the data showed. A result is evidence, not a conclusion: treat a causal claim as established only when the assistant's answer confirms it.

Tool failures:
- A tool failure is a call that returned an error, timed out, or came back empty because of how the call was made. Record it only when the same failure signature recurs in the tool calls or already appears on the page. Put it on the integration page of the system the tool talks to, under ## Tool failures, as one bullet: the failure signature, its durable cause, and what works instead. A single typo is not a failure signature: a failure that happened once and went away when the call was corrected (a misspelled function, a wrong argument) is recorded nowhere on the page, not under ## Tool failures and not as general advice under ## Common pitfalls.

Relations:
- Record how components relate on ontology pages: name each component by its page slug exactly as the catalog shows it, never a display name, and add one relation line per edge. Read "A depends_on B" as "A needs B", "A reads_from B" as "A pulls data from B", "A calls B" as "A sends requests to B" and "A publishes_to B" as "A pushes data to B"; the arrow always points from the component that acts to the one it acts on. Nodes are the system's own components, such as services, controllers, jobs and data stores; never add an integration or a telemetry connector as a node, since where a component's logs are stored is not a relation between components. State one edge per pair of components, in the direction its kind implies, and never its reverse. Also list a service's dependencies on its own page.

Rules:
- Only propose facts that the transcript actually established. No speculation.
- Never include credentials, tokens, API keys, or personal data.
- Prefer corroborating an existing page over creating a near-duplicate.
- New pages use action "upsert" with markdown content. Keep content short and reusable.
- Use "corroborate" when the investigation confirms an existing page without changing it.
- An "upsert" replaces the whole page. When the page's content is shown under "Existing page content", start from it: keep every section, fact, field name and query convention that the transcript does not contradict, add what the transcript establishes, and change only what it proves wrong. Never shorten a page by dropping knowledge that is still true, and never drop a section it has. If the transcript adds nothing to a page, "corroborate" it instead of rewriting it.
- A slug names a recurring condition, never one occurrence of it. Never put a date, region, cloud, availability zone, cluster, node, or host in a slug — those belong in the page content. "constructor-plan-failed-capacity" is a slug; "constructor-plan-failed-capacity-aws-us-east-1-2026-09-22" is not.
- When this investigation is another instance of a condition the catalog already documents, "corroborate" that page — and "upsert" the same slug when there is genuinely new detail to fold in. Never open a second page for the same mechanism because the date, region, or cluster differs.
- Use "archive" only when the transcript shows a page is wrong or obsolete.
- entity_type must be one of: ${CORTEX_ENTITY_TYPES.join(', ')}.
- slug is a short kebab-case identifier. Reuse an existing page's slug exactly. Never prefix slug with "cortex", the entity type, or a document id.
- Propose at most ${MAX_PROPOSALS} edits. Return an empty list if nothing durable was learned.`,
      input: `Existing pages:\n${catalogLines}\n\n${
        pageBodyLines.length > 0 ? `Existing page content:\n${pageBodyLines}\n\n` : ''
      }Investigation transcript:\n${transcript}`,
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
  provenance,
  roundKind = 'initial',
  logger,
}: {
  store: CortexPageStore;
  edits: CortexEditProposal[];
  telemetry: CortexTelemetry;
  provenance?: WriteProvenance;
  /** Only an initial round's rewrite of a page counts as a corroboration of it. */
  roundKind?: CortexRoundKind;
  logger: Logger;
}): Promise<AppliedWriteRecord[]> => {
  const { pages } = await store.list();
  logger.info(`Applying ${edits.length} Cortex edit(s)`);
  logger.debug(
    `Cortex edit proposals: ${edits
      .map((edit) => `${edit.action}:${edit.entity_type}/${edit.slug}`)
      .join(', ')}`
  );
  const applied: AppliedCortexEdit[] = [];
  const appliedWrites: AppliedWriteRecord[] = [];
  const hasProvenance = Boolean(
    provenance?.conversationId || provenance?.roundId || provenance?.workflowExecutionId
  );
  // A run confirms a page at most once, and never one it created: promotion needs a confirmation
  // from a later run.
  const touchedIds = new Set<string>();
  // A fresh investigation that did not write a page can confirm it by reaching the same finding.
  const isIndependentInvestigation = (page: CortexPageSummary): boolean =>
    roundKind === 'initial' &&
    !(provenance?.conversationId && page.authored_by?.includes(provenance.conversationId));
  // Integrations hold where a component's telemetry lives; they are not components of the graph.
  const integrationSlugs = new Set([
    ...pages
      .filter(({ entity_type: entityType }) => entityType === 'integration')
      .map((page) =>
        canonicalizeSlug(page.entity_type, slugFromCortexId(page.id, page.entity_type))
      ),
    ...edits
      .filter(({ entity_type: entityType }) => entityType === 'integration')
      .map((edit) => resolveSlug(edit, pages)),
  ]);
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
        const before = await store.get(id);
        // Only ground truth or an independent investigation can confirm a page. A follow-up is one
        // person's say-so, and a conversation cannot confirm a page it wrote itself.
        if (before && roundKind !== 'alert_recovery' && !isIndependentInvestigation(before)) {
          logger.info(
            `Skipped corroborating ${edit.entity_type}/${slug}: this round cannot confirm it (${roundKind} round, or the conversation wrote the page)`
          );
          continue;
        }
        const updated = hasProvenance
          ? await store.corroborate(id, provenance)
          : await store.corroborate(id);
        if (updated) {
          touchedIds.add(id);
          applied.push({ action: 'corroborate', entityType: edit.entity_type });
          appliedWrites.push({
            store: 'cortex',
            item_id: id,
            action: 'corroborate',
            version: updated.doc_version ?? updated.version ?? 1,
            ...(before ? { before_status: before.status, before_content: before.content } : {}),
            after_status: updated.status,
            after_content: updated.content,
          });
          logger.debug(`Corroborated Cortex page ${id}`);
        }
        continue;
      }

      if (edit.action === 'archive') {
        const before = await store.get(id);
        const updated = hasProvenance
          ? await store.archive(id, undefined, provenance)
          : await store.archive(id);
        if (updated) {
          applied.push({ action: 'archive', entityType: edit.entity_type });
          appliedWrites.push({
            store: 'cortex',
            item_id: id,
            action: 'archive',
            version: updated.doc_version ?? updated.version ?? 1,
            ...(before ? { before_status: before.status, before_content: before.content } : {}),
            after_status: updated.status,
            after_content: updated.content,
          });
          logger.debug(`Archived Cortex page ${id}`);
        }
        continue;
      }

      // An ontology page is a graph of the system's components. The model keeps adding edges that
      // are not part of it (a component "publishing to" the telemetry integration that holds its
      // logs, a component related to itself, both directions of one pair), so those lines are
      // removed here rather than trusted to the prompt.
      // A heading with nothing under it only adds noise to every page the investigator reads.
      let proposedContent =
        edit.content === undefined ? undefined : dropEmptySections(edit.content);
      if (edit.entity_type === 'ontology' && proposedContent !== undefined) {
        const tidied = tidyCortexOntology(proposedContent, integrationSlugs);
        if (tidied.dropped.length > 0) {
          logger.info(
            `Dropped ${tidied.dropped.length} line(s) from ontology/${slug}: ${tidied.dropped
              .map(({ line, reason }) => `${reason} "${line}"`)
              .join('; ')}`
          );
        }
        proposedContent = tidied.content;
      }

      // A page that names a date, an id or a count of events describes one occurrence, which is stale
      // once it ends. The other edits in the run still apply. Details that can only go stale when the
      // system changes, such as how many replicas run, are reported but do not cost the page.
      const violations = lintCortexContent(
        [slug, edit.title, edit.description ?? '', proposedContent ?? ''].join('\n')
      );
      const blocking = violations.filter((violation) => violation.blocking);
      if (blocking.length > 0) {
        logger.warn(
          `Skipped Cortex edit ${edit.entity_type}/${slug}: content is tied to one occurrence (${[
            ...new Set(blocking.map(({ rule, match }) => `${rule} "${match}"`)),
          ].join(', ')})`
        );
        continue;
      }
      if (violations.length > 0) {
        logger.info(
          `Kept Cortex edit ${edit.entity_type}/${slug} with details that can go stale (${[
            ...new Set(violations.map(({ rule, match }) => `${rule} "${match}"`)),
          ].join(', ')})`
        );
      }

      const existing = await store.get(id);
      // Rewriting a live page in a fresh investigation means that investigation re-established it,
      // so it counts as a corroboration. A follow-up or recovery rewrite is one person's correction
      // or one alert's outcome, and a conversation cannot corroborate a page it wrote itself, so
      // neither promotes the page. New pages start tentative, and rewriting an archived page revives
      // it as tentative, so a single run can never publish a fact as established. A page already
      // touched this run keeps its status, so a page revived earlier in the run is not promoted on
      // its old count.
      const alreadyTouched = touchedIds.has(id);
      const confirms =
        existing !== undefined &&
        existing.status !== 'archived' &&
        !alreadyTouched &&
        isIndependentInvestigation(existing);
      const corroborations = confirms ? existing.corroborations + 1 : existing?.corroborations;
      // Only a write that creates, revives or confirms the page uses up this run's one confirmation.
      // A recovery round's revision of a live page does not, so a corroborate of it still applies
      // whichever order the model lists the two edits in.
      if (confirms || existing === undefined || existing.status === 'archived') {
        touchedIds.add(id);
      }
      const status = !existing
        ? 'tentative'
        : alreadyTouched || !confirms
        ? existing.status === 'archived'
          ? 'tentative'
          : existing.status
        : statusAfterCorroboration(existing.status, corroborations ?? 0);
      const afterContent = proposedContent ?? existing?.content ?? '';
      const written = await store.upsert({
        entityType: edit.entity_type,
        slug,
        title: edit.title,
        description: edit.description ?? existing?.description,
        content: afterContent,
        status,
        corroborations,
        ...(hasProvenance || existing?.doc_version !== undefined
          ? { docVersion: (existing?.doc_version ?? 0) + 1 }
          : {}),
        conversationId: provenance?.conversationId ?? existing?.conversation_id,
        roundId: provenance?.roundId ?? existing?.round_id,
        workflowExecutionId: provenance?.workflowExecutionId ?? existing?.workflow_execution_id,
        // Only a write that creates or rewrites the page makes this conversation its author.
        ...(provenance?.conversationId
          ? {
              authoredBy: [
                ...(existing?.authored_by ?? []).filter(
                  (author) => author !== provenance.conversationId
                ),
                provenance.conversationId,
              ],
            }
          : {}),
      });
      applied.push({ action: 'upsert', entityType: edit.entity_type });
      appliedWrites.push({
        store: 'cortex',
        item_id: id,
        action: 'upsert',
        version: written?.doc_version ?? written?.version ?? 1,
        ...(existing ? { before_status: existing.status, before_content: existing.content } : {}),
        after_status: status,
        after_content: afterContent,
      });
      logger.debug(`Upserted Cortex page ${id}`);
    }
  } finally {
    telemetry.reportEditsApplied(applied);
  }
  return appliedWrites;
};

export const optimizeCortex = async ({
  store,
  proposeEdits,
  userMessage,
  assistantMessage,
  toolCalls,
  roundKind = 'initial',
  previousAssistantMessage,
  telemetry,
  provenance,
  logger,
}: {
  store: CortexPageStore;
  proposeEdits: ProposeCortexEdits;
  userMessage: string;
  assistantMessage: string;
  toolCalls: InvestigationToolCall[];
  /** What the round is: a follow-up or an alert recovery weighs more than a single investigation. */
  roundKind?: CortexRoundKind;
  /** The earlier round's final answer, which a follow-up or recovery round refers to. */
  previousAssistantMessage?: string;
  telemetry: CortexTelemetry;
  provenance?: WriteProvenance;
  logger: Logger;
}): Promise<AppliedWriteRecord[]> => {
  await store.pruneDuplicates();
  const { pages: allPages } = await store.list();
  // Reinforcement-owned pages are kept out of the catalog so the model never proposes edits to them.
  const pages = allPages.filter(
    (page) => !isReinforcementOwnedSlug(slugFromCortexId(page.id, page.entity_type))
  );
  const transcript = [
    '## Round',
    `Kind: ${roundKind}`,
    '',
    ...(roundKind !== 'initial' && previousAssistantMessage
      ? ['## Previous answer', previousAssistantMessage.slice(0, MAX_TRANSCRIPT_CHARS), '']
      : []),
    '## User',
    userMessage.slice(0, MAX_TRANSCRIPT_CHARS),
    '',
    '## Tool calls',
    renderToolCalls(toolCalls),
    '',
    '## Assistant',
    assistantMessage.slice(0, MAX_TRANSCRIPT_CHARS),
  ].join('\n');

  const currentConversationId = provenance?.conversationId;
  // The model rewrites a page as a whole, so it has to read the pages it may rewrite: the ones this
  // conversation wrote when a later round judges or corrects them, and the ones the transcript names.
  const transcriptText = transcript.toLowerCase();
  const slugOf = (page: CortexPageSummary) =>
    canonicalizeSlug(page.entity_type, slugFromCortexId(page.id, page.entity_type));
  const isAuthoredHere = (page: CortexPageSummary) =>
    roundKind !== 'initial' &&
    currentConversationId !== undefined &&
    page.authored_by?.includes(currentConversationId) === true;
  const isNamed = (page: CortexPageSummary) =>
    slugOf(page).length >= MIN_SLUG_CHARS_TO_MATCH && transcriptText.includes(slugOf(page));
  const liveInOrder = pages.filter((page) => page.status !== 'archived');
  const wanted = [
    ...liveInOrder.filter(isAuthoredHere),
    ...liveInOrder.filter((page) => !isAuthoredHere(page) && isNamed(page)),
  ].slice(0, MAX_PAGE_BODIES);
  const pageBodies = (await Promise.all(wanted.map((page) => store.get(page.id)))).flatMap((page) =>
    page && page.status !== 'archived'
      ? [
          {
            slug: slugOf(page),
            entity_type: page.entity_type,
            content: page.content,
          },
        ]
      : []
  );

  const { edits } = await proposeEdits({
    transcript,
    catalog: pages,
    currentConversationId,
    ...(pageBodies.length > 0 ? { pageBodies } : {}),
  });
  logger.info(`Cortex optimizer proposed ${edits.length} edit(s)`);
  if (edits.length === 0) {
    return [];
  }

  return applyCortexEdits({ store, edits, telemetry, provenance, roundKind, logger });
};
