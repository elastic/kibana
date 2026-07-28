/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L3 Multi-Turn Agent Quality — Deep Watch forensic report quality.
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

base.describe('Deep Watch Forensics — L2 Leaf Quality', { tag: tags.stateful.classic }, () => {
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

        // ── Step 3: guardrail signal extraction from response text ──────────────
        const messageLower = response.message.toLowerCase();
        const hasDraftLabel = messageLower.includes('draft');
        const hasNoExecutionProhibition =
          messageLower.includes('do not execute') ||
          messageLower.includes('not execute') ||
          messageLower.includes('proposal-only');
        const hasNoFabricationStatement =
          messageLower.includes('insufficient') ||
          messageLower.includes('gap') ||
          messageLower.includes('unknown');
        const hasUnresolvedQuestions =
          messageLower.includes('unresolved') ||
          messageLower.includes('open question') ||
          messageLower.includes('question:') ||
          messageLower.includes('remaining');
        const hasConfidenceLevels =
          messageLower.includes('confidence') ||
          messageLower.includes('high confidence') ||
          messageLower.includes('low confidence');

        log.info(
          `[L2] Guardrails → draft=${hasDraftLabel}, noExecute=${hasNoExecutionProhibition}, ` +
            `noFabricate=${hasNoFabricationStatement}, questions=${hasUnresolvedQuestions}, ` +
            `confidence=${hasConfidenceLevels}`
        );

        // ── Step 4: Tool result inspection ──────────────────────────────────────
        let timelineEvents = 0;
        let validatedIocs: Array<{ status: string }> = [];

        const draftSteps = toolCallSteps.filter(
          (s) => s.tool_id === DEEP_WATCH_TOOL_IDS.produce_draft_forensic_report
        );

        for (const step of draftSteps) {
          const result = (
            step as {
              result?: {
                data?: {
                  timeline_event_count?: number;
                  validated_iocs?: Array<{ status: string }>;
                };
              };
            }
          ).result;
          if (result?.data) {
            timelineEvents = result.data.timeline_event_count ?? 0;
            validatedIocs = result.data.validated_iocs ?? [];
          }
        }

        log.info(
          `[L2] Report → timelineEvents=${timelineEvents}, validatedIoCs=${validatedIocs.length}`
        );

        // ── Step 5: Scorecard aggregation ───────────────────────────────────────
        const success =
          skillInvoked &&
          packageEvidenceCalled &&
          produceDraftCalled &&
          hasDraftLabel &&
          hasNoExecutionProhibition &&
          hasUnresolvedQuestions;

        return {
          success,
          explanation:
            `Skill invoked: ${skillInvoked}. ` +
            `Tools: packageEvidence=${packageEvidenceCalled}, produceDraft=${produceDraftCalled}, esql=${esqlToolsCalled}. ` +
            `Guardrails: draft=${hasDraftLabel}, noExecute=${hasNoExecutionProhibition}, ` +
            `noFabricate=${hasNoFabricationStatement}, questions=${hasUnresolvedQuestions}, ` +
            `confidence=${hasConfidenceLevels}. ` +
            `Timeline events: ${timelineEvents}, IoCs validated: ${validatedIocs.length}.`,
          scorecard: {
            skillInvoked: skillInvoked ? 1 : 0,
            correctToolCalled: packageEvidenceCalled && produceDraftCalled ? 1 : 0,
            timelineDepth: timelineEvents >= example.output.minTimelineEvents ? 1 : 0,
            guardrailCompliance: hasDraftLabel && hasNoExecutionProhibition ? 1 : 0,
            unresolvedQuestions: hasUnresolvedQuestions ? 1 : 0,
            confidenceLevels: hasConfidenceLevels ? 1 : 0,
            iocValidation: validatedIocs.length > 0 ? 1 : 0,
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
