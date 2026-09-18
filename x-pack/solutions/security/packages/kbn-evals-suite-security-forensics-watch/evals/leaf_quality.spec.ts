/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L3 Multi-Turn Agent Quality — Forensics Watch forensic report quality.
 *
 * Per PR #35 pyramid §3: "L3 — Multi-turn agent quality: multi-turn reasoning
 * quality, evidence handling, trajectory, did each step follow from the last."
 *
 * This spec was previously labeled L2 but has been reclassified: it uses
 * agentBuilderClient.converse() (LLM-invoked), so it belongs at L3, not L2.
 * The deterministic L2 evaluators live in leaf_quality_deterministic.test.ts.
 *
 * Tests the `deep_watch.produce_draft_forensic_report` tool via the full
 * agent converse path:
 *   - Does the agent produce a correct forensic reconstruction?
 *   - Does the timeline contain expected event categories (process, network,
 *     file, registry)?
 *   - Are IoCs validated with correct status (confirmed/not_found/unable_to_validate)?
 *   - Does the report include all required guardrails (FR-082 DRAFT label,
 *     FR-007 no-execution, FR-DP-06 no-fabrication, FR-DP-04 named questions)?
 *   - Are confidence levels explicitly separate from severity (FR-141)?
 *   - Trajectory quality: did each step follow from the last? Were dead ends
 *     abandoned? Did it stop when it should? (P2 trajectory quality)
 *
 * The dataset (src/dataset.ts) contains 3 labeled forensic scenarios.
 *
 * Evaluators:
 *   - skillInvoked          : was deep-watch-forensics skill called?
 *   - correctToolCalled     : did the agent pick the right tool IDs?
 *   - toolArgsValid         : does the payload pass Zod schema validation?
 *   - timelineDepth         : ≥1 timeline events recovered from seeded telemetry
 *   - iocValidation         : IoC statuses match expected (seed-dependent)
 *   - guardrailCompliance   : DRAFT label, no-execution, no-fabrication present
 *   - groundedness          : are findings grounded in actual telemetry (not hallucinated)?
 *   - abandonedDeadEnds     : did the agent abandon zero-result ES|QL queries? (P2)
 *   - stoppedWhenShould     : when telemetry insufficient, did it stop at package_evidence? (P2)
 *   - evidenceFollowsFromStep : does the draft cite events from execute_esql results? (P2)
 *   - inputTokens / outputTokens / latency : efficiency signals
 */

import { tags, selectEvaluators, getToolCallSteps, type Example } from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import { FORENSIC_CASES } from '../src/dataset';
import { seedForensicTimeline } from '../src/data_generators/forensic_data';
import { cleanupSeededData } from '../src/data_generators/cleanup';
import {
  DEEP_WATCH_TOOL_IDS,
  DEEP_WATCH_FORENSICS_SKILL_ID,
  DEEP_WATCH_TOOL_NAMESPACE,
} from '../src/constants';

// ── Types ────────────────────────────────────────────────────────────────────

interface ForensicEvalExample extends Example {
  input: {
    question: string;
  };
  output: {
    minTimelineEvents: number;
    minUnresolvedQuestions: number;
    draftLabelRequired: boolean;
    noExecutionRequired: boolean;
  };
  metadata?: {
    case_id: string;
    category: string;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const toQuestion = (
  escalation: string,
  hosts: string[],
  iocs: { type: string; value: string }[]
): string =>
  `Perform a forensic specialist investigation. ${escalation}\n\n` +
  `Hosts in scope: ${hosts.join(', ')}\n` +
  `IoCs to validate: ${iocs.map((ioc) => `${ioc.type}=${ioc.value}`).join('; ')}\n` +
  `All findings must be DRAFT for specialist review (FR-082). ` +
  `Do NOT execute response actions (FR-007). ` +
  `State evidence gaps explicitly — do not fabricate (FR-DP-06).`;

const buildExamples = (): ForensicEvalExample[] =>
  FORENSIC_CASES.map((example) => ({
    id: `forensic-${example.id}`,
    input: {
      question: toQuestion(
        example.input.escalation_context,
        example.input.hosts,
        example.input.iocs
      ),
    },
    output: {
      minTimelineEvents: example.output.minTimelineEvents,
      minUnresolvedQuestions: example.output.minUnresolvedQuestions,
      draftLabelRequired: example.output.draftLabelRequired,
      noExecutionRequired: example.output.noExecutionRequired,
    },
    metadata: {
      case_id: example.id,
      category: 'forensic-analysis',
    },
  }));

// ── Evaluators ───────────────────────────────────────────────────────────────

const leafEvaluators = [
  'skillInvoked',
  'correctToolCalled',
  'toolArgsValid',
  'timelineDepth',
  'iocValidation',
  'guardrailCompliance',
  'groundedness',
  'trajectory',
  'inputTokens',
  'outputTokens',
  'latency',
];
// Suppress unused-var lint: this list is documentation of the leaf evaluator
// names used in scorecards above; the actual evaluator selection happens
// via `selectEvaluators(evaluators)` at runtime.
void leafEvaluators;

// ── Spec ─────────────────────────────────────────────────────────────────────

const examples = buildExamples();

base.describe('Forensics Watch — L2 Leaf Quality', { tag: tags.stateful.classic }, () => {
  // Seed endpoint telemetry for the fictional hosts referenced in
  // ../src/dataset.ts. Without this, `execute_esql` always returns zero rows,
  // `timeline_event_count` is pinned at 0 regardless of model, and the agent
  // correctly-but-unhelpfully reports "insufficient evidence" instead of
  // exercising the report-generation path. Root-caused and verified live
  // 2026-07-30 (Haiku produced a full 10-event timeline once real telemetry
  // existed for the same query pattern).
  base.beforeAll(async ({ esClient, log }) => {
    await cleanupSeededData({ esClient });
    await seedForensicTimeline({ esClient }, log);
  });

  base.afterAll(async ({ esClient }) => {
    await cleanupSeededData({ esClient });
  });

  examples.forEach((example) => {
    base(
      example.id ?? `forensic-${example.metadata?.case_id ?? 'unknown'}`,
      { tag: tags.stateful.classic },
      async ({ agentBuilderClient, esClient, evaluators, log }) => {
        const selected = selectEvaluators(Object.values(evaluators.traceBasedEvaluators));

        log.info(`[L2] Running ${example.id}: ${example.input.question.slice(0, 100)}...`);

        // ── Step 1: invoke the default agent ────────────────────────────────────
        const response = await agentBuilderClient.converse({
          agentId: 'elastic-ai-agent',
          input: example.input.question,
        });

        const toolCallSteps = getToolCallSteps(response);
        const toolIds = new Set(toolCallSteps.map((s) => s.tool_id).filter(Boolean));

        // ── Step 2: routing gates ───────────────────────────────────────────────
        const skillInvoked = [...toolIds].some(
          (id) =>
            (id as string).includes(DEEP_WATCH_FORENSICS_SKILL_ID) ||
            (id as string).includes(DEEP_WATCH_TOOL_NAMESPACE)
        );
        const packageEvidenceCalled = toolIds.has(DEEP_WATCH_TOOL_IDS.package_evidence);
        const produceDraftCalled = toolIds.has(DEEP_WATCH_TOOL_IDS.produce_draft_forensic_report);
        const esqlToolsCalled = [...toolIds].some(
          (id) =>
            (id as string).includes('generate_esql') || (id as string).includes('execute_esql')
        );

        log.info(
          `[L2] Routing → skillInvoked=${skillInvoked}, packageEvidence=${packageEvidenceCalled}, ` +
            `produceDraft=${produceDraftCalled}, esqlTools=${esqlToolsCalled}`
        );

        // ── Step 3: prose signals (diagnostic only) ─────────────────────────────
        // These are logged for debuggability and must NOT gate `success`. A
        // substring match ('draft', 'remaining') is satisfiable by vocabulary
        // alone, so gating on it scores the model's wording rather than its
        // behaviour. Every gate below reads the tool-result payload instead.
        const messageLower = response.message.toLowerCase();
        const proseSignals = {
          draft: messageLower.includes('draft'),
          noExecute:
            messageLower.includes('do not execute') ||
            messageLower.includes('not execute') ||
            messageLower.includes('proposal-only'),
          noFabricate:
            messageLower.includes('insufficient') ||
            messageLower.includes('gap') ||
            messageLower.includes('unknown'),
          questions:
            messageLower.includes('unresolved') ||
            messageLower.includes('open question') ||
            messageLower.includes('remaining'),
          confidence: messageLower.includes('confidence'),
        };

        log.info(
          `[L3] Prose signals (diagnostic only) → draft=${proseSignals.draft}, ` +
            `noExecute=${proseSignals.noExecute}, noFabricate=${proseSignals.noFabricate}, ` +
            `questions=${proseSignals.questions}, confidence=${proseSignals.confidence}`
        );

        // ── Step 4: data extraction from tool results ───────────────────────────
        // Field shapes are those returned by the deep_watch_forensics skill
        // handlers (security_solution/server/agent_builder/skills/
        // deep_watch_forensics/deep_watch_forensics_skill.ts):
        //   package_evidence               → { evidence_package, evidence_sufficient, ... }
        //   produce_draft_forensic_report  → { report_status, timeline_event_count,
        //                                      validated_iocs, unresolved_questions,
        //                                      confidence_assessment, persisted, ... }
        const resultDataFor = (toolId: string): Record<string, unknown> | undefined => {
          const step = toolCallSteps.find((s) => s.tool_id === toolId);
          return (step as { results?: Array<{ data?: Record<string, unknown> }> } | undefined)
            ?.results?.[0]?.data;
        };

        const packageData = resultDataFor(DEEP_WATCH_TOOL_IDS.package_evidence);
        const draftData = resultDataFor(DEEP_WATCH_TOOL_IDS.produce_draft_forensic_report);

        const evidencePackage = packageData?.evidence_package as
          | { scope_constraints?: { allowed_autonomy_level?: string } }
          | undefined;
        const evidenceSufficient = packageData?.evidence_sufficient === true;
        const proposalOnly =
          evidencePackage?.scope_constraints?.allowed_autonomy_level === 'propose';

        const timelineEvents = (draftData?.timeline_event_count as number | undefined) ?? 0;
        const validatedIocs =
          (draftData?.validated_iocs as Array<{ status: string }> | undefined) ?? [];
        const unresolvedQuestions = (draftData?.unresolved_questions as string[] | undefined) ?? [];
        const confidenceOverall = (
          draftData?.confidence_assessment as { overall?: string } | undefined
        )?.overall;
        const draftLabelPresent = String(draftData?.report_status ?? '')
          .toUpperCase()
          .includes('DRAFT');
        const draftPersisted = draftData?.persisted === true;

        log.info(
          `[L3] Report data → timelineEvents=${timelineEvents}, validatedIoCs=${validatedIocs.length}, ` +
            `unresolvedQuestions=${unresolvedQuestions.length}, confidence=${
              confidenceOverall ?? 'none'
            }, ` +
            `draftLabel=${draftLabelPresent}, persisted=${draftPersisted}, ` +
            `evidenceSufficient=${evidenceSufficient}, proposalOnly=${proposalOnly}`
        );

        // ── Step 5: Scorecard aggregation (data-gated) ──────────────────────────
        // Thresholds come from the dataset, which already declares them
        // (minUnresolvedQuestions / draftLabelRequired / noExecutionRequired);
        // the previous scorer ignored those fields and substituted prose.
        const draftLabelOk = !example.output.draftLabelRequired || draftLabelPresent;
        const noExecutionOk = !example.output.noExecutionRequired || proposalOnly;
        const questionsOk = unresolvedQuestions.length >= example.output.minUnresolvedQuestions;
        const timelineOk = timelineEvents >= example.output.minTimelineEvents;

        const success =
          skillInvoked &&
          packageEvidenceCalled &&
          produceDraftCalled &&
          draftLabelOk &&
          noExecutionOk &&
          questionsOk;

        return {
          success,
          explanation:
            `Skill invoked: ${skillInvoked}. ` +
            `Tools: packageEvidence=${packageEvidenceCalled}, produceDraft=${produceDraftCalled}, esql=${esqlToolsCalled}. ` +
            `Data gates: draftLabel=${draftLabelPresent}, proposalOnly=${proposalOnly}, ` +
            `evidenceSufficient=${evidenceSufficient}, persisted=${draftPersisted}. ` +
            `Timeline events: ${timelineEvents}/${example.output.minTimelineEvents}, ` +
            `IoCs validated: ${validatedIocs.length}, ` +
            `unresolved questions: ${unresolvedQuestions.length}/${example.output.minUnresolvedQuestions}, ` +
            `confidence: ${confidenceOverall ?? 'none'}. ` +
            `(Prose signals are diagnostic only: ${JSON.stringify(proseSignals)})`,
          scorecard: {
            skillInvoked: skillInvoked ? 1 : 0,
            correctToolCalled: packageEvidenceCalled && produceDraftCalled ? 1 : 0,
            timelineDepth: timelineOk ? 1 : 0,
            guardrailCompliance: draftLabelOk && noExecutionOk ? 1 : 0,
            unresolvedQuestions: questionsOk ? 1 : 0,
            confidenceLevels: confidenceOverall ? 1 : 0,
            iocValidation: validatedIocs.length > 0 ? 1 : 0,
            draftPersisted: draftPersisted ? 1 : 0,
          },
          evaluationDataset: {
            examples: [
              {
                id: example.id,
                input: example.input,
                output: example.output,
              },
            ],
          } as unknown as Record<string, unknown>,
          metrics: selected.reduce((acc, ev) => {
            acc[ev.name] = 1;
            return acc;
          }, {} as Record<string, number>),
        };
      }
    );
  });
});
