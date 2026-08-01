/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import {
  buildProposalFromWorkerRun,
  buildEvidencePackageFromWorkerRun,
  buildWorkerEvaluationRecord,
  sourceWatchSchema,
  type SourceWatch,
} from '../../common/schemas';
import type { Provenance } from '../../common/schemas/worker_evaluation_record';
import {
  detectionChangeSignalSchema,
  ruleTuningTriggerSchema,
  detectionGapSchema,
  type DetectionChangeSignal,
  type RuleTuningTrigger,
} from '../../common/schemas/detection_change';

const EMIT_PROPOSAL_PATH = `${PND_INVESTIGATIONS_URL}/_emit_proposal` as const;

const WorkerRunSchema = z
  .object({
    watch: z.string().optional(),
    classification: z.string().optional(),
    finding: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0),
    rationale: z.string().optional(),
    recommendedAction: z.string().optional(),
    recommendedContainment: z.string().optional(),
    // Live-state osquery findings (mutex enumeration, current process state, persistence-still-
    // active verification) — distinct from `report`'s historical-telemetry reconstruction. Carried
    // onto the persisted proposal so the analyst can see what live-state evidence backs the
    // containment recommendation, separate from what was only ever observed historically.
    osqueryFindings: z.string().optional(),
    report: z.string().optional(),
    alertId: z.string().optional(),
    investigationId: z.string().default('unknown'),
    ruleName: z.string().optional(),
    severity: z.string().optional(),
    // Concrete drafted rule body (G4). Detection Watch rule-creation worker renders this; carried
    // onto the persisted proposal so the analyst sees the actual query/index/severity to review.
    proposedRule: z
      .object({
        name: z.string().optional(),
        mitreTechnique: z.string().optional(),
        query: z.string().optional(),
        indexPattern: z.string().optional(),
        severity: z.string().optional(),
      })
      .partial()
      .optional(),
    indicators: z.array(z.unknown()).optional(),
    modelId: z.string().optional(),
    connectorId: z.string().optional(),
    latencyMs: z.number().optional(),
    // LLM token usage (gap #6) — sourced from the ai.agent step's own
    // `metadata.usage` (input_tokens/output_tokens accumulated from model_usage
    // events), rendered by the worker YAML. Optional: a worker that reported no
    // usage omits them and the provenance block simply carries no token counts,
    // rather than fabricating zeros as if the model were free.
    inputTokens: z.number().nonnegative().optional(),
    outputTokens: z.number().nonnegative().optional(),
    totalTokens: z.number().nonnegative().optional(),
    // Detection Change Signal (delta #1/#2). The Dark/Deep worker YAML renders the model's
    // `detection_change_signal.gaps` to a JSON string here. Optional/conditional: absent, empty,
    // 'null', or an empty array all mean "no gap" and nothing is attached to the Investigation.
    detectionChangeSignalGaps: z.string().optional(),
    // Rule-Tuning trigger (delta #3). The Floor worker YAML renders 'false_positive' here ONLY when
    // the alert was dispositioned as a false positive; empty/absent means no trigger.
    ruleTuningTriggerReason: z.string().optional(),
    // Orchestrator-supplied dedup tag (gate A1). When present, the EvidencePackage id is derived
    // deterministically from it, so two concurrent triggers carrying the SAME tag collapse onto one
    // evidence package instead of minting one each.
    //
    // Deliberately OPT-IN rather than always-on keyed off alertId: gate D6 requires that a
    // re-triggered run against the same alert still records its own Proposal (the analyst must see
    // both touches). Only the evidence package — the expensive, duplicated artifact A1 names — is
    // collapsed, and only when the caller explicitly asserts "this is a retry of that trigger".
    dedupTag: z.string().min(1).max(512).optional(),
  })
  .passthrough();

type WorkerRun = z.infer<typeof WorkerRunSchema>;

/**
 * Build the provenance block for a WorkerEvaluationRecord from the worker's
 * reported usage (gap #6). Token counts, model, connector, and latency all come
 * from the ai.agent step's own `metadata.usage`, never guessed.
 *
 * costBasis is deliberately conservative:
 *  - 'self-hosted' when we have real token counts but no verified USD price.
 *    The tokens are authoritative; the dollar cost is not, so we label the
 *    basis rather than inventing a costUsd. (EIS/self-hosted connectors carry
 *    no per-token list price we can trust here.)
 *  - 'unknown' when the worker reported no token usage at all — there is
 *    nothing to base a cost on, and we must not imply the run was free.
 *
 * No costUsd is emitted: attaching a number would assert a price we cannot
 * verify. When a ratified price table lands (gap follow-up), costUsd + a
 * 'list-price' basis can be derived from these same token counts.
 */
const buildProvenance = (workerRun: WorkerRun): Provenance => {
  const hasTokens =
    workerRun.inputTokens !== undefined ||
    workerRun.outputTokens !== undefined ||
    workerRun.totalTokens !== undefined;

  return {
    modelId: workerRun.modelId ?? 'unknown',
    connectorId: workerRun.connectorId ?? 'unknown',
    latencyMs: workerRun.latencyMs ?? 0,
    ...(workerRun.inputTokens !== undefined ? { inputTokens: workerRun.inputTokens } : {}),
    ...(workerRun.outputTokens !== undefined ? { outputTokens: workerRun.outputTokens } : {}),
    ...(workerRun.totalTokens !== undefined ? { totalTokens: workerRun.totalTokens } : {}),
    costBasis: hasTokens ? 'self-hosted' : 'unknown',
  };
};

/**
 * DetectionChangeSignal. Returns undefined when there is no real gap (absent / empty / 'null' /
 * empty array / malformed), so an absent signal attaches nothing (conditional emission).
 */
const parseDetectionChangeSignal = (
  raw: string | undefined,
  sourceWatch: SourceWatch,
  runId: string,
  investigationId: string
): DetectionChangeSignal | undefined => {
  if (sourceWatch !== 'watch-dark' && sourceWatch !== 'watch-deep' && sourceWatch !== 'watch-ad')
    return undefined;
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === '[]' || trimmed === '""')
    return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  const gapsResult = z.array(detectionGapSchema).safeParse(parsed);
  if (!gapsResult.success || gapsResult.data.length === 0) return undefined;
  const signal = detectionChangeSignalSchema.safeParse({
    sourceWatch,
    runId,
    investigationId,
    gaps: gapsResult.data,
  });
  return signal.success ? signal.data : undefined;
};

/**
 * Build a typed RuleTuningTrigger from the Floor worker's rendered reason. Returns undefined for any
 * non-false-positive disposition (conditional emission).
 */
const buildRuleTuningTrigger = (
  reason: string | undefined,
  alertId: string,
  confidence: number,
  investigationId: string,
  ruleRef?: string
): RuleTuningTrigger | undefined => {
  if (reason?.trim() !== 'false_positive') return undefined;
  const trigger = ruleTuningTriggerSchema.safeParse({
    reason: 'false_positive',
    alertId,
    confidence,
    investigationId,
    ...(ruleRef ? { ruleRef } : {}),
  });
  return trigger.success ? trigger.data : undefined;
};

/**
 * Derive a deterministic EvidencePackage id from an orchestrator dedup tag (gate A1).
 *
 * Two concurrent triggers carrying the same tag must produce exactly ONE evidence package.
 * `saveEvidencePackage` already writes overwrite-by-id, so a stable id is sufficient to
 * collapse them — no distributed lock or orchestrator-side dedup layer is required.
 *
 * The tag is scoped by investigationId so the same tag reused across different
 * investigations cannot collide, and hashed so an arbitrary caller-supplied string
 * can't inject characters into an ES document id.
 */
const deriveDedupedEvidenceId = (dedupTag: string, investigationId: string): string =>
  `evidence-${createHash('sha256')
    .update(`${investigationId}:${dedupTag}`)
    .digest('hex')
    .slice(0, 32)}`;

const EmitProposalRequestBody = z.object({
  sourceWatch: sourceWatchSchema,
  draft: z.boolean().optional(),
  hilRequired: z.boolean().optional(),
  workerRun: WorkerRunSchema,
});

/**
 * Turn a Watch Worker run into the canonical Daybreak contract artifacts:
 * a Proposal, an EvidencePackage, and exactly one WorkerEvaluationRecord,
 * persisted to the PND indices the Throughline UI + E&T scorers read.
 *
 * Called by the Watch Orchestrator workflows (workflow.execute -> http step).
 * Fail-soft: partial ES write failures are logged and the endpoint returns 200
 * with whatever succeeded, because the orchestrator step is continue-on-failure.
 */
export const registerEmitProposalRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EMIT_PROPOSAL_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Emit canonical Daybreak contract artifacts from a Watch Worker run',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(EmitProposalRequestBody) },
        },
      },
      async (context, request, response) => {
        const { sourceWatch, draft, workerRun } = request.body;
        const store = getInvestigationStore();

        // Derive a verdict from the worker output shape:
        // - Floor emits an explicit classification (true_positive / false_positive / inconclusive)
        // - Dark/Deep emit a finding; treat a high-confidence finding as a positive,
        //   otherwise flag it as needing evidence.
        const verdict =
          workerRun.classification ??
          (workerRun.confidence >= 0.5 ? 'true_positive' : 'needs_evidence');
        const summary =
          workerRun.rationale ?? workerRun.finding ?? workerRun.report ?? 'Watch worker run';
        // No caller (Floor's alert trigger, Dark/Deep's escalation inputs) ever mints a fresh
        // investigationId today — Floor Watch is the entry point and starts from a bare alert
        // with none. Fall back to a stable id derived from the alert so repeated runs against
        // the same alert land on the same Investigation instead of each minting a new one.
        const investigationId =
          workerRun.investigationId !== 'unknown' && workerRun.investigationId !== ''
            ? workerRun.investigationId
            : workerRun.alertId != null
            ? `inv-${sourceWatch}-${workerRun.alertId}`
            : `inv-${sourceWatch}-${uuidv4()}`;
        const alertId = workerRun.alertId ?? investigationId;

        // Detection Change Signal (delta #1/#2) — Dark/Deep only, conditional. runId = the worker
        // eval run id below is generated fresh; reuse a stable id for the signal + its timeline event.
        const detectionRunId = uuidv4();
        const detectionChangeSignal = parseDetectionChangeSignal(
          workerRun.detectionChangeSignalGaps,
          sourceWatch as SourceWatch,
          detectionRunId,
          investigationId
        );

        // Rule-Tuning trigger (delta #3) — Floor false-positive disposition only, conditional.
        const ruleTuningTrigger = buildRuleTuningTrigger(
          workerRun.ruleTuningTriggerReason,
          alertId,
          workerRun.confidence,
          investigationId,
          workerRun.ruleName
        );

        const proposal = buildProposalFromWorkerRun({
          id: uuidv4(),
          sourceWatch: sourceWatch as SourceWatch,
          investigationId,
          ruleName: workerRun.ruleName ?? `${sourceWatch} finding`,
          alertId,
          verdict,
          severity: workerRun.severity,
          confidence: workerRun.confidence,
          reasoning: summary,
          summary,
          draft: draft ?? false,
          proposedRule: workerRun.proposedRule,
        });

        // Gate A1: when the orchestrator supplies a dedup tag, the evidence id is derived from it
        // so a duplicate trigger overwrites the same document instead of minting a second package.
        const evidence = buildEvidencePackageFromWorkerRun({
          id:
            workerRun.dedupTag != null
              ? deriveDedupedEvidenceId(workerRun.dedupTag, investigationId)
              : uuidv4(),
          kind:
            sourceWatch === 'watch-deep'
              ? 'forensic'
              : sourceWatch === 'watch-dark'
              ? 'hunt'
              : 'alert',
          sourceRef: alertId,
          summary,
          confidence: workerRun.confidence,
          alertId,
        });

        const workerEval = buildWorkerEvaluationRecord({
          id: uuidv4(),
          watch: sourceWatch,
          investigationId,
          runId: uuidv4(),
          verdict,
          confidence: workerRun.confidence,
          proposalId: proposal.id,
          evidenceRefs: [evidence.id],
          provenance: buildProvenance(workerRun),
        });

        // Link evidence to the proposal.
        proposal.evidenceRefs = [evidence.id];

        // Attach the Rule-Tuning trigger to the proposal so Detection Watch's Rule Tuning worker can
        // subscribe to it. Optional: only present on a false-positive disposition.
        if (ruleTuningTrigger != null) {
          proposal.ruleTuningTrigger = ruleTuningTrigger;
        }

        const written: string[] = [];
        if (store != null) {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // Open the Investigation Conversation on first touch (idempotent — see
          // createInvestigationIfMissing's doc comment). This is the step the Floor
          // orchestrator's own description promises ("creates the Investigation
          // Conversation") but that no code path actually performed until now: every
          // proposal/evidence/workerEval write below references investigationId, but
          // nothing minted the Investigation document itself, so it never appeared in
          // the PND UI.
          try {
            await store.createInvestigationIfMissing(esClient, {
              id: investigationId,
              template_id: 'investigation',
              title: workerRun.ruleName ?? `${sourceWatch} finding — ${alertId}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              watch_id: sourceWatch,
              watch_execution_id: uuidv4(),
              watch_tier: (sourceWatch === 'watch-floor'
                ? 'floor'
                : sourceWatch === 'watch-dark'
                ? 'dark'
                : sourceWatch === 'watch-deep'
                ? 'deep'
                : 'floor') as 'floor' | 'dark' | 'deep',
              severity: workerRun.severity,
              status: 'open',
              pendingProposalCount: 1,
              summary,
              events: [],
            });
            written.push('investigation');
          } catch (error) {
            logger.warn(`PND: emit_proposal investigation create failed: ${error?.message}`);
          }

          try {
            await store.saveEvidencePackage(esClient, evidence);
            written.push('evidence');
          } catch (error) {
            logger.warn(`PND: emit_proposal evidence write failed: ${error?.message}`);
          }
          try {
            await store.saveProposal(esClient, proposal, request);
            written.push('proposal');
          } catch (error) {
            logger.warn(`PND: emit_proposal proposal write failed: ${error?.message}`);
          }
          try {
            await store.saveWorkerEvaluationRecord(esClient, workerEval);
            written.push('workerEval');
          } catch (error) {
            logger.warn(`PND: emit_proposal worker-eval write failed: ${error?.message}`);
          }

          // Detection Change Signal (delta #1/#2): when a Dark/Deep worker surfaced a real coverage
          // gap, ATTACH it to the Investigation (a `detection-change` timeline event + the structured
          // signal persisted on the investigation doc) so Detection Watch can consume it. The worker
          // never creates or tunes rules itself. Conditional: skipped entirely when no gap.
          if (detectionChangeSignal != null) {
            const techniques = detectionChangeSignal.gaps.map((g) => g.technique).join(', ');
            try {
              await store.recordDetectionChangeSignal(esClient, {
                investigationId,
                signal: detectionChangeSignal,
                event: {
                  id: `evt-detection-change-${detectionChangeSignal.runId}`,
                  timestamp: new Date().toISOString(),
                  type: 'detection-change',
                  summary: `${sourceWatch} surfaced a detection coverage gap (${detectionChangeSignal.gaps.length}): ${techniques} — routed to Detection Watch`,
                  actor: `system-${sourceWatch}`,
                },
              });
              written.push('detectionChangeSignal');
            } catch (error) {
              logger.warn(
                `PND: emit_proposal detection-change signal write failed: ${error?.message}`
              );
            }
          }

          // Deep Watch closes the loop on the investigation timeline: append the
          // worker's forensic findings as timeline events, flip the investigation
          // status to `deep-watch-complete`, and surface the verdict summary so
          // the Throughline UI shows Deep Watch finished the investigation.
          if (sourceWatch === 'watch-deep') {
            const now = Date.now();
            const at = (offsetSeconds: number) =>
              new Date(now + offsetSeconds * 1000).toISOString();
            const runReport = workerRun as Record<string, unknown>;
            const asText = (value: unknown): string | undefined =>
              typeof value === 'string' && value.trim().length > 0 ? value : undefined;

            const forensicEvents = [
              asText(runReport.patient_zero) &&
                `Patient-zero confirmed: ${asText(runReport.patient_zero)}`,
              asText(runReport.timeline_summary) &&
                `Attack timeline: ${asText(runReport.timeline_summary)}`,
              asText(runReport.lateral_movement) &&
                `Lateral movement: ${asText(runReport.lateral_movement)}`,
              asText(runReport.persistence) && `Persistence: ${asText(runReport.persistence)}`,
              asText(runReport.ioc_validation) &&
                `IoC validation: ${asText(runReport.ioc_validation)}`,
              (asText(workerRun.osqueryFindings) ?? asText(runReport.osquery_findings)) &&
                `Osquery live-state findings: ${
                  asText(workerRun.osqueryFindings) ?? asText(runReport.osquery_findings)
                }`,
            ].filter((line): line is string => Boolean(line));

            const containment =
              asText(workerRun.recommendedContainment) ?? asText(runReport.recommended_containment);

            const events = [
              {
                id: `evt-deep-run-${workerEval.runId}`,
                timestamp: at(0),
                type: 'investigation',
                summary:
                  'Deep Watch accepted escalation — forensic worker started under the demo service identity',
                actor: 'system-security-watch-deep',
              },
              ...forensicEvents.map((line, index) => ({
                id: `evt-deep-finding-${workerEval.runId}-${index}`,
                timestamp: at(index + 1),
                type: 'evidence',
                summary: line,
                actor: 'system-security-watch-deep',
              })),
              {
                id: `evt-deep-verdict-${workerEval.runId}`,
                timestamp: at(forensicEvents.length + 1),
                type: 'classification',
                summary: `Deep Watch verdict: ${verdict} (confidence ${workerRun.confidence.toFixed(
                  2
                )})`,
                actor: 'system-security-watch-deep',
              },
              {
                id: `evt-deep-complete-${workerEval.runId}`,
                timestamp: at(forensicEvents.length + 2),
                type: 'resolution',
                summary: containment
                  ? `Deep Watch investigation complete — forensic report produced; recommended containment: ${containment}`
                  : 'Deep Watch investigation complete — forensic report produced, awaiting analyst decision',
                actor: 'system-security-watch-deep',
              },
            ];

            try {
              await store.recordDeepWatchOutcome(esClient, {
                investigationId,
                events,
                status: 'deep-watch-complete',
                summary,
              });
              written.push('deepWatchOutcome');
            } catch (error) {
              logger.warn(`PND: emit_proposal deep-watch outcome write failed: ${error?.message}`);
            }
          }
        }

        return response.ok({
          body: {
            proposalId: proposal.id,
            evidenceId: evidence.id,
            workerEvalId: workerEval.id,
            status: proposal.status,
            written,
          },
        });
      }
    );
};
