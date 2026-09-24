/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import {
  THREAT_CATEGORIES,
  THREAT_REGIONS,
  type SeverityLevel,
} from '../../../common/threat_intel';
import type { ExtractedIoc } from './extract_iocs';
import {
  prepareIocAdjudication,
  reconcileIocAdjudication,
  type AdjudicateIocsResult,
  type IocAdjudicationCandidate,
} from './adjudicate_iocs';
import { severityScore } from './severity';
import { logStageUsage } from '../lib/cost_tracker';
import {
  fullArticleContext,
  isContextLengthError,
  selectDistributedArticleContext,
  type ArticleContext,
} from './article_context';

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

const behaviorSchema = z.object({
  technique_id: z.string().transform(normalizeAttackTechniqueId),
  description: z.string().transform((value) => value.slice(0, 2_000)),
  telemetry_targets: z
    .array(z.string())
    .transform((values) => [...new Set(values.map((value) => value.slice(0, 256)))].slice(0, 20)),
  confidence: z.number().min(0).max(1),
});

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

const artifactSchema = z.object({
  type: z.enum(ARTIFACT_TYPES),
  value: z.string().transform((value) => value.slice(0, 2_048)),
  context: z.string().transform((value) => value.slice(0, 1_000)),
});

export const reportCoreModelOutputSchema = z.object({
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
});

export type ReportCoreModelOutput = z.infer<typeof reportCoreModelOutputSchema>;

export interface EnrichReportCoreParams {
  text: string;
  iocs: ExtractedIoc[];
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

IOC candidates were extracted deterministically from the complete source. Return IDs only for
URLs or domains the source explicitly attributes to attacker-controlled or malicious
infrastructure. Never approve citations, vendor/documentation links, researcher PoCs, navigation,
shared-platform roots, examples, or same-origin article links. Candidate IDs preserve exact values;
do not rewrite an IOC.

Report id: ${params.report_id ?? ''}
Report title: ${params.title ?? ''}
Report URL: ${params.article_url ?? ''}

IOC candidates:
${JSON.stringify(candidatePayload(candidates))}

Source:
${text}`;

export const enrichReportCore = async (
  model: ScopedModel,
  logger: Logger,
  params: EnrichReportCoreParams
): Promise<EnrichReportCoreResult> => {
  const prepared = prepareIocAdjudication(params);
  const structured = model.chatModel.withStructuredOutput(reportCoreModelOutputSchema, {
    includeRaw: true,
  });

  let context = fullArticleContext(params.text);
  let result: {
    raw: { response_metadata: Record<string, unknown> };
    parsed: ReportCoreModelOutput;
  };
  try {
    result = (await structured.invoke(buildPrompt(params, context.text, prepared.reviewable))) as {
      raw: { response_metadata: Record<string, unknown> };
      parsed: ReportCoreModelOutput;
    };
  } catch (error) {
    if (!isContextLengthError(error)) throw error;
    context = selectDistributedArticleContext(params.text);
    result = (await structured.invoke(buildPrompt(params, context.text, prepared.reviewable))) as {
      raw: { response_metadata: Record<string, unknown> };
      parsed: ReportCoreModelOutput;
    };
  }

  logStageUsage(
    logger,
    'enrich_report_core',
    model.connector.connectorId,
    result.raw.response_metadata ?? {}
  );

  const validCandidateIds = new Set(prepared.reviewable.map((candidate) => candidate.id));
  const approvedIds = new Set(
    result.parsed.approved_ioc_candidate_ids.filter((id) => validCandidateIds.has(id))
  );
  const adjudicated = reconcileIocAdjudication(prepared, approvedIds, params.truncated);
  const { text: _text, ...contextMetadata } = context;

  return {
    categories: result.parsed.categories,
    regions: result.parsed.regions,
    relevance: result.parsed.relevance,
    diamond_suitable: result.parsed.diamond_suitable,
    severity: {
      level: result.parsed.severity.level,
      score: severityScore(result.parsed.severity.level),
      ...(result.parsed.severity.rationale ? { rationale: result.parsed.severity.rationale } : {}),
    },
    behaviors: result.parsed.behaviors.map((behavior) => ({
      ...behavior,
      id: behaviorId(behavior),
      llm_confidence: behavior.confidence,
    })),
    artifacts: result.parsed.artifacts,
    ...adjudicated,
    context: contextMetadata,
    model_id: model.connector.connectorId,
  };
};
