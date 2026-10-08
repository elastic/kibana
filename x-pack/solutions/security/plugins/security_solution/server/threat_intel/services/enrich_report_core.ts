/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { isContextLengthExceededError } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  THREAT_CATEGORIES,
  THREAT_REGIONS,
  type SeverityLevel,
} from '../../../common/threat_intel';
import type { ExtractedIoc } from './extract_iocs';
import {
  boundIocAdjudicationForOverflow,
  boundIocAdjudicationForPayload,
  chunkIocAdjudicationBatches,
  hashIocSet,
  prepareIocAdjudication,
  reconcileIocAdjudication,
  type AdjudicateIocsResult,
  type IocAdjudicationCandidate,
  type PreparedIocAdjudication,
} from './adjudicate_iocs';
import { severityScore } from './severity';
import { logStageUsage } from '../lib/cost_tracker';
import {
  furtherShrinkOverflowArticleContext,
  fullArticleContext,
  selectOverflowRetryArticleContext,
  type ArticleContext,
} from './article_context';
import { requireParsedStructuredOutput } from './structured_output';

const closedSet = <T extends string>(allowed: readonly T[], max: number) =>
  z
    .array(z.string())
    .transform((values) => values.filter((value): value is T => allowed.includes(value as T)))
    .transform((values) => [...new Set(values)].slice(0, max));

const ATTACK_TECHNIQUE_ID_PATTERN = /^T\d{4}(?:\.\d{3})?$/;

const normalizeAttackTechniqueId = (value: string): string => {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/^(T\d{4})\/(\d{3})$/, '$1.$2');
  return ATTACK_TECHNIQUE_ID_PATTERN.test(normalized) ? normalized : '';
};

const behaviorSchema = lazySchema(() =>
  z.object({
    technique_id: z.string().transform(normalizeAttackTechniqueId),
    description: z.string().transform((value) => value.slice(0, 2_000)),
    telemetry_targets: z
      .array(z.string())
      .transform((values) => [...new Set(values.map((value) => value.slice(0, 256)))].slice(0, 20)),
    confidence: z.number().min(0).max(1),
  })
);

const ARTIFACT_TYPES = [
  'campaign_id',
  'mutex',
  'user_agent',
  'registry_key',
  'file_path',
  'filename',
  'service_name',
  'scheduled_task',
  'named_pipe',
  'process_name',
  'command_line',
  'ja3',
  'ja3s',
  'jarm',
  'ja4',
  'imphash',
  'pdb_path',
  'certificate_serial',
  'yara_rule',
  'hosting_platform',
  'other',
] as const;

const artifactSchema = lazySchema(() =>
  z.object({
    type: z.enum(ARTIFACT_TYPES),
    value: z.string().transform((value) => value.slice(0, 2_048)),
    context: z.string().transform((value) => value.slice(0, 1_000)),
  })
);

export const reportCoreModelOutputSchema = lazySchema(() =>
  z.object({
    categories: closedSet(THREAT_CATEGORIES, THREAT_CATEGORIES.length),
    regions: closedSet(THREAT_REGIONS, THREAT_REGIONS.length),
    relevance: z.number().min(0).max(1),
    diamond_suitable: z.boolean(),
    severity: z.object({
      level: z.enum(['low', 'medium', 'high', 'critical']),
      rationale: z
        .string()
        .transform((value) => value.slice(0, 2_000))
        .optional(),
    }),
    approved_ioc_candidate_ids: z.array(z.number().int().min(0).max(4_999)).max(300),
    behaviors: z.array(behaviorSchema).max(100),
    artifacts: z.array(artifactSchema).max(200),
  })
);

const iocAdjudicationOnlySchema = lazySchema(() =>
  z.object({
    approved_ioc_candidate_ids: z.array(z.number().int().min(0).max(4_999)).max(300),
  })
);

export type ReportCoreModelOutput = z.infer<typeof reportCoreModelOutputSchema>;

export interface EnrichReportCoreParams {
  text: string;
  iocs: ExtractedIoc[];
  /** When set, preferred over recomputing from the (possibly capped) IOC array. */
  ioc_set_hash?: string | null;
  title?: string;
  article_url?: string;
  report_id?: string;
  truncated?: boolean;
}

export interface ReportBehavior extends z.infer<typeof behaviorSchema> {
  id: string;
  llm_confidence: number;
}

export interface EnrichReportCoreResult
  extends Omit<ReportCoreModelOutput, 'approved_ioc_candidate_ids' | 'severity' | 'behaviors'>,
    AdjudicateIocsResult {
  severity: {
    level: SeverityLevel;
    score: number;
    rationale?: string;
  };
  behaviors: ReportBehavior[];
  context: Omit<ArticleContext, 'text'>;
  model_id: string;
}

const behaviorId = (behavior: z.infer<typeof behaviorSchema>): string =>
  createHash('sha256').update(`${behavior.technique_id}\n${behavior.description}`).digest('hex');

const candidatePayload = (candidates: IocAdjudicationCandidate[]) =>
  candidates.map(({ id, ioc, context }) => ({
    id,
    type: ioc.type,
    value: ioc.value,
    context,
  }));

const iocCandidateInstructions = `IOC candidates were extracted deterministically from the complete source. Return IDs only for
URLs or domains the source explicitly attributes to attacker-controlled or malicious
infrastructure. Never approve citations, vendor/documentation links, researcher PoCs, navigation,
shared-platform roots, examples, or same-origin article links. Candidate IDs preserve exact values;
do not rewrite an IOC.`;

const buildPrompt = (
  params: EnrichReportCoreParams,
  text: string,
  candidates: IocAdjudicationCandidate[]
): string => `You are a precision-first threat-intelligence extraction engine.

Return one strict structured result covering taxonomy, intrinsic severity, attacker behaviors,
forensic artifacts, Diamond suitability, and IOC verdicts. Use only facts explicitly present in
the source. Do not invent attribution, indicators, urgency, or ATT&CK mappings.

Taxonomy:
- categories: values only from ${JSON.stringify(THREAT_CATEGORIES)}
- regions: values only from ${JSON.stringify(THREAT_REGIONS)}
- relevance: 0 means commentary/PR; 0.5 means IOC-only; 0.75 means described TTPs; 1 means
  concrete commands, registry keys, process patterns, or similarly durable detection behavior.
- diamond_suitable: true only for specific technical actor, campaign, capability,
  infrastructure, or victim evidence suitable for Diamond summarization.

Severity is intrinsic impact if the described attack succeeds:
- critical: unauthenticated RCE, mass supply-chain compromise, full domain/tenant takeover,
  destructive operations, or material business halt.
- high: privilege escalation to admin/root, widespread credential theft, or significant intrusion.
- medium: limited exposure, denial of service, user-interaction exploitation, or ordinary campaign.
- low: background research or low-impact activity. Do not invent urgency.

Behaviors:
- one item per concrete attacker behavior;
- technique_id is an explicitly cited or clearly supported ATT&CK id, otherwise "";
- description must stand alone and name the concrete mechanism;
- telemetry_targets are observable data sources or artifact classes;
- confidence is 0..1 based only on source support.

Artifacts are literal host or campaign evidence that is not already an IOC. Supported artifact
types: ${JSON.stringify(ARTIFACT_TYPES)}.

${iocCandidateInstructions}

Report id: ${params.report_id ?? ''}
Report title: ${params.title ?? ''}
Report URL: ${params.article_url ?? ''}

IOC candidates:
${JSON.stringify(candidatePayload(candidates))}

Source:
${text}`;

/**
 * Follow-up adjudication uses per-candidate context windows only. Resending the
 * full article on every batch would multiply source tokens by batch count.
 */
const buildAdjudicationOnlyPrompt = (
  params: EnrichReportCoreParams,
  candidates: IocAdjudicationCandidate[]
): string => `You are adjudicating threat-intelligence IOC candidates.

${iocCandidateInstructions}

Each candidate includes a short local context window from the source. Judge from that
window and the candidate value alone; do not assume facts that are not present there.

Report id: ${params.report_id ?? ''}
Report title: ${params.title ?? ''}
Report URL: ${params.article_url ?? ''}

IOC candidates:
${JSON.stringify(candidatePayload(candidates))}`;

const withBatchPrepared = (
  base: PreparedIocAdjudication,
  reviewable: IocAdjudicationCandidate[]
): PreparedIocAdjudication => ({
  ...base,
  reviewable,
});

/**
 * Invoke a structured model call with two overflow retries. Candidate bounding is
 * prompt-local: skipped IOCs keep heuristic tiers and are not treated as rejections.
 */
const invokeWithOverflowBounds = async <TParsed>({
  invoke,
  build,
  articleText,
  prepared,
}: {
  invoke: (prompt: string) => Promise<{
    raw: { response_metadata: Record<string, unknown> };
    parsed: TParsed;
  }>;
  build: (text: string, candidates: IocAdjudicationCandidate[]) => string;
  articleText: string;
  prepared: PreparedIocAdjudication;
}): Promise<{
  result: {
    raw: { response_metadata: Record<string, unknown> };
    parsed: TParsed;
  };
  context: ArticleContext;
  reviewed: PreparedIocAdjudication;
}> => {
  let context = fullArticleContext(articleText);
  let reviewed = prepared;
  try {
    const result = await invoke(build(context.text, reviewed.reviewable));
    return { result, context, reviewed };
  } catch (error) {
    if (!isContextLengthExceededError(error as Error)) throw error;
    context = selectOverflowRetryArticleContext(articleText);
    reviewed = boundIocAdjudicationForOverflow(prepared);
    try {
      const result = await invoke(build(context.text, reviewed.reviewable));
      return { result, context, reviewed };
    } catch (retryError) {
      if (!isContextLengthExceededError(retryError as Error)) throw retryError;
      context = furtherShrinkOverflowArticleContext(context);
      reviewed = boundIocAdjudicationForPayload(reviewed);
      const result = await invoke(build(context.text, reviewed.reviewable));
      return { result, context, reviewed };
    }
  }
};

/**
 * Adjudication-only batches omit the article body, so overflow retries only bound
 * the candidate payload (not article windows).
 */
const invokeAdjudicationBatch = async ({
  invoke,
  build,
  prepared,
}: {
  invoke: (prompt: string) => Promise<{
    raw: { response_metadata: Record<string, unknown> };
    parsed: z.infer<typeof iocAdjudicationOnlySchema>;
  }>;
  build: (candidates: IocAdjudicationCandidate[]) => string;
  prepared: PreparedIocAdjudication;
}): Promise<{
  result: {
    raw: { response_metadata: Record<string, unknown> };
    parsed: z.infer<typeof iocAdjudicationOnlySchema>;
  };
  reviewed: PreparedIocAdjudication;
}> => {
  let reviewed = prepared;
  try {
    const result = await invoke(build(reviewed.reviewable));
    return { result, reviewed };
  } catch (error) {
    if (!isContextLengthExceededError(error as Error)) throw error;
    reviewed = boundIocAdjudicationForOverflow(prepared);
    try {
      const result = await invoke(build(reviewed.reviewable));
      return { result, reviewed };
    } catch (retryError) {
      if (!isContextLengthExceededError(retryError as Error)) throw retryError;
      reviewed = boundIocAdjudicationForPayload(reviewed);
      const result = await invoke(build(reviewed.reviewable));
      return { result, reviewed };
    }
  }
};

export const enrichReportCore = async (
  model: ScopedModel,
  logger: Logger,
  params: EnrichReportCoreParams
): Promise<EnrichReportCoreResult> => {
  // Prefer extract_iocs' fingerprint: it hashes before the response cap, so a
  // truncated report keeps the same correlation key the workflow persists.
  const correlationHash =
    params.ioc_set_hash !== undefined ? params.ioc_set_hash : hashIocSet(params.iocs);
  const prepared = prepareIocAdjudication(params);
  const { batches } = chunkIocAdjudicationBatches(prepared.reviewable);
  const [firstBatch = [], ...queuedBatches] = batches;

  const coreStructured = model.chatModel.withStructuredOutput(reportCoreModelOutputSchema, {
    includeRaw: true,
  });
  const adjudicationStructured = model.chatModel.withStructuredOutput(iocAdjudicationOnlySchema, {
    includeRaw: true,
  });

  const coreStartedAt = Date.now();
  const coreCall = await invokeWithOverflowBounds({
    invoke: async (prompt) => {
      const invoked = (await coreStructured.invoke(prompt)) as {
        raw: { response_metadata: Record<string, unknown> };
        parsed: ReportCoreModelOutput | null;
      };
      return requireParsedStructuredOutput(invoked, 'enrich_report_core');
    },
    build: (text, candidates) => buildPrompt(params, text, candidates),
    articleText: params.text,
    prepared: withBatchPrepared(prepared, firstBatch),
  });
  const coreWallMs = Date.now() - coreStartedAt;

  const approvedIds = new Set(
    coreCall.result.parsed.approved_ioc_candidate_ids.filter((id) =>
      coreCall.reviewed.reviewable.some((candidate) => candidate.id === id)
    )
  );
  const reviewedCandidates = [...coreCall.reviewed.reviewable];
  const reviewedIds = new Set(reviewedCandidates.map((candidate) => candidate.id));

  // Overflow may shrink the first batch. Re-queue anything not yet reviewed so it
  // still gets a later adjudication pass instead of a silent heuristic leave-behind.
  const skippedFromFirst = firstBatch.filter((candidate) => !reviewedIds.has(candidate.id));
  const pendingBatches = [
    ...chunkIocAdjudicationBatches([...skippedFromFirst, ...queuedBatches.flat()]).batches,
  ];

  for (const batch of pendingBatches.filter((entry) => entry.length > 0)) {
    const batchStartedAt = Date.now();
    try {
      const batchCall = await invokeAdjudicationBatch({
        invoke: async (prompt) => {
          const invoked = (await adjudicationStructured.invoke(prompt)) as {
            raw: { response_metadata: Record<string, unknown> };
            parsed: z.infer<typeof iocAdjudicationOnlySchema> | null;
          };
          return requireParsedStructuredOutput(invoked, 'enrich_report_core_ioc_batch');
        },
        build: (candidates) => buildAdjudicationOnlyPrompt(params, candidates),
        prepared: withBatchPrepared(prepared, batch),
      });
      const batchWallMs = Date.now() - batchStartedAt;
      for (const id of batchCall.result.parsed.approved_ioc_candidate_ids) {
        if (batchCall.reviewed.reviewable.some((candidate) => candidate.id === id)) {
          approvedIds.add(id);
        }
      }
      for (const candidate of batchCall.reviewed.reviewable) {
        if (!reviewedIds.has(candidate.id)) {
          reviewedCandidates.push(candidate);
          reviewedIds.add(candidate.id);
        }
      }
      logStageUsage(
        logger,
        'enrich_report_core_ioc_batch',
        model.connector.connectorId,
        batchCall.result.raw.response_metadata ?? {},
        batchWallMs
      );
    } catch (error) {
      // A follow-up batch is optional: the already-computed core result (taxonomy,
      // severity, first-batch verdicts) must not be thrown away because one later
      // batch could not produce valid structured output. Leave its candidates out
      // of reviewedIds so they fall into deferredUnreviewed below, same as any
      // other batch-budget deferral.
      logger.warn(
        `enrich_report_core_ioc_batch failed, deferring its ${batch.length} candidates: ` +
          `${(error as Error).message}`
      );
    }
  }

  logStageUsage(
    logger,
    'enrich_report_core',
    model.connector.connectorId,
    coreCall.result.raw.response_metadata ?? {},
    coreWallMs
  );

  // Anything still unreviewed after overflow-bounded follow-ups keeps its heuristic
  // tier (deferred), rather than being labeled a model rejection.
  const deferredUnreviewed =
    prepared.deferredUnreviewed +
    prepared.reviewable.filter((candidate) => !reviewedIds.has(candidate.id)).length;

  const reviewedPrepared: PreparedIocAdjudication = {
    output: prepared.output,
    reviewable: reviewedCandidates,
    deterministicReferences: prepared.deterministicReferences,
    deferredUnreviewed,
  };
  const adjudicated = reconcileIocAdjudication(reviewedPrepared, approvedIds, {
    truncated: params.truncated,
    correlationHash,
  });
  const { text: _text, ...contextMetadata } = coreCall.context;
  const parsed = coreCall.result.parsed;

  return {
    categories: parsed.categories,
    regions: parsed.regions,
    relevance: parsed.relevance,
    diamond_suitable: parsed.diamond_suitable,
    severity: {
      level: parsed.severity.level,
      score: severityScore(parsed.severity.level),
      ...(parsed.severity.rationale ? { rationale: parsed.severity.rationale } : {}),
    },
    behaviors: parsed.behaviors.map((behavior) => ({
      ...behavior,
      id: behaviorId(behavior),
      llm_confidence: behavior.confidence,
    })),
    artifacts: parsed.artifacts,
    ...adjudicated,
    context: contextMetadata,
    model_id: model.connector.connectorId,
  };
};
