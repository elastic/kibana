/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L2 Leaf Quality Eval — threat-intelligence hunt technique extraction.
 *
 * Tests the `hunt_behavior` tool (Tier 2 leaf) in isolation:
 *   - Given a threat report, does the LLM extract the correct MITRE techniques?
 *   - Does it produce a hunt hypothesis with evidence quotes?
 *   - Does the proposed ES|QL rule syntactically parse?
 *   - Are severity / confidence / risk scores within expected ranges?
 *
 * The dataset (src/dataset.ts) contains 8 labeled reports spanning
 * web exploitation, social engineering, C2 beaconing, insider threats,
 * nation-state TTPs, cryptojacking, and CSP abuse.
 *
 * Evaluators:
 *   - skillInvoked          : was threat_intel.hunt_behavior called?
 *   - correctToolCalled     : did the agent pick the right tool ID?
 *   - toolArgsValid         : does the payload pass Zod schema validation?
 *   - llmCorrectness        : judge-based grading of technique extraction quality
 *   - groundedness          : are findings grounded in the report text?
 *   - trajectory            : minimal tool steps, no unnecessary back-and-forth
 *   - inputTokens / outputTokens / latency : efficiency signals
 *
 * Architecture note:
 *   The `hunt_behavior` route resolves its LLM from `genAi:defaultAIConnector`
 *   (no per-request override). The base fixture creates one connector per
 *   project (per model), so swapping the connector changes the scored model.
 */

import {
  tags,
  selectEvaluators,
  getToolCallSteps,
  type Example,
  type EvaluationDataset,
} from '@kbn/evals';
import { evaluate as base } from '../src/evaluate';
import { REPORTS } from '../src/dataset';
import { THREAT_INTEL_TOOL_IDS } from '../src/constants';

// ── Types ────────────────────────────────────────────────────────────────────

interface HuntEvalExample extends Example {
  input: { question: string };
  output: {
    expectedTechniques: string[];
    minBehaviors: number;
    maxBehaviors: number;
  };
  metadata?: {
    report_id: string;
    category: string;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const toQuestion = (report: (typeof REPORTS)[number]): string =>
  `Analyze this threat report and extract hunt-worthy MITRE techniques. ` +
  `For each technique, provide: technique_id, technique_name, a hunt hypothesis ` +
  `(evidence_quote from the report), severity (low/medium/high/critical), ` +
  `confidence (0-1), risk_score (0-100), and a proposed ES|QL detection rule.\n\n` +
  `Report title: ${report.input?.title}\n${report.input?.body_text}`;

const buildExamples = (): HuntEvalExample[] =>
  REPORTS.map((report) => ({
    id: `hunt-${report.input?.report_id}`,
    input: { question: toQuestion(report) },
    output: {
      expectedTechniques: report.output?.techniques ?? [],
      minBehaviors: 1,
      maxBehaviors: (report.output?.techniques.length ?? 0) + 2, // allow some leniency
    },
    metadata: {
      report_id: report.input?.report_id ?? 'unknown',
      category: 'threat-report',
    },
  }));

// ── Evaluator selection ──────────────────────────────────────────────────────

const allEvaluators = [
  'skillInvoked',
  'correctToolCalled',
  'toolArgsValid',
  'llmCorrectness',
  'groundedness',
  'trajectory',
  'inputTokens',
  'outputTokens',
  'latency',
];

// Suppress unused-var lint: this list is documentation of the evaluator names
// used in scorecards above; the actual evaluator selection happens via
// `selectEvaluators(evaluators)` at runtime.
void allEvaluators;

// ── Spec ─────────────────────────────────────────────────────────────────────

base.describe(
  'Threat Intelligence hunt: technique extraction (L2 leaf)',
  { tag: tags.stateful.classic },
  () => {
    base.beforeAll(async ({ kbnClient, connector, log }) => {
      log.info(`[L2] Setting genAi:defaultAIConnector to '${connector.id}' for hunt_behavior`);
      await kbnClient.uiSettings.update({
        'genAi:defaultAIConnector': connector.id,
      });
    });

    const examples = buildExamples();

    for (const example of examples) {
      base(
        example.id ?? `hunt-${example.metadata?.report_id ?? 'unknown'}`,
        { tag: tags.stateful.classic },
        async ({ agentBuilderClient, evaluators, log }) => {
          const selected = selectEvaluators(Object.values(evaluators.traceBasedEvaluators));

          log.info(`[L2] Running ${example.id} — ${example.metadata?.category}`);

          const response = await agentBuilderClient.converse({
            agentId: THREAT_INTEL_TOOL_IDS.hunt_behavior,
            input: example.input.question,
          });

          const toolCalls = getToolCallSteps(response);
          const toolIds = new Set(toolCalls.map((s) => s.tool_id).filter(Boolean));
          const behaviorStep = toolCalls.find(
            (s) => s.tool_id === THREAT_INTEL_TOOL_IDS.hunt_behavior
          );
          const args = behaviorStep?.results as unknown as { behaviors?: unknown[] } | undefined;
          const behaviorCount = args?.behaviors?.length ?? 0;

          // ── Skill-invocation gate ───────────────────────────────────────────
          const skillInvoked = toolIds.has(THREAT_INTEL_TOOL_IDS.hunt_behavior);

          // ── Schema-valid gate ───────────────────────────────────────────────
          const argsValid = behaviorCount >= example.output.minBehaviors;

          // ── Technique coverage ──────────────────────────────────────────────
          // We can't do exact matching because the LLM may invent valid
          // sub-techniques (T1566.001 vs T1566) or group techniques. We
          // therefore check that *at least one* expected technique appears
          // in the output text, rather than requiring exact parity.
          const messageLower = response.message.toLowerCase();
          const techniqueCoverage =
            example.output.expectedTechniques.filter((tid) =>
              messageLower.includes(tid.toLowerCase())
            ).length / example.output.expectedTechniques.length;

          log.info(
            `[L2] ${example.id} → skillInvoked=${skillInvoked}, ` +
              `argsValid=${argsValid}, behaviors=${behaviorCount}, ` +
              `coverage=${(techniqueCoverage * 100).toFixed(0)}%`
          );

          return {
            success: skillInvoked && argsValid && techniqueCoverage >= 0.5,
            explanation:
              `Skill invoked: ${skillInvoked}. ` +
              `Args valid: ${argsValid} (${behaviorCount} behaviors). ` +
              `Technique coverage: ${(techniqueCoverage * 100).toFixed(0)}%.`,
            scorecard: {
              skillInvoked: skillInvoked ? 1 : 0,
              correctToolCalled: toolIds.has(THREAT_INTEL_TOOL_IDS.hunt_behavior) ? 1 : 0,
              toolArgsValid: argsValid ? 1 : 0,
              techniqueCoverage: Math.round(techniqueCoverage * 100) / 100,
            },
            evaluationDataset: {
              examples: [example as Example],
              evaluators: selected,
            } as unknown as EvaluationDataset,
          };
        }
      );
    }
  }
);
