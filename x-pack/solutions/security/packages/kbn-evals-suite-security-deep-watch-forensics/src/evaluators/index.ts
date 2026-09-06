/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { ForensicTaskOutput } from '../types';

/**
 * L2 Deterministic Evaluators — Deep Watch Forensics
 *
 * Per PR #35 pyramid §3: "No LLM below L3." L0–L2 must be deterministic CODE.
 * These evaluators score the `produce_draft_forensic_report` tool output
 * against the expected shape and content from the golden dataset — no
 * agentBuilderClient.converse(), no LLM-as-judge.
 *
 * Evaluators:
 *   - TimelineAccuracy        : fraction of expected timeline events recovered
 *   - IocValidationAccuracy   : confirmed/not_found/unable_to_validate match expected
 *   - ReportSectionCompleteness : presence of all 6 required sections
 *   - DraftLabelEnforcement   : report_status contains DRAFT
 *   - UnresolvedQuestionsNamed : at least one unresolved question present
 *   - ConfidenceSeparateFromSeverity : confidence_assessment.note references FR-141
 *
 * All deterministic CODE — no judge LLM.
 */

/**
 * Scores timeline reconstruction accuracy.
 *
 * Compares the report's timeline_event_count against the expected minimum
 * from the golden dataset. Score is 1.0 when the threshold is met, scaled
 * proportionally below that.
 *
 * Deterministic CODE — no judge LLM.
 */
export function createTimelineAccuracyEvaluator(minEventsByCase: Map<string, number>): Evaluator {
  return {
    name: 'Timeline Accuracy',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ input, output }) => {
      const out = output as ForensicTaskOutput | undefined;
      const caseId = (input as { case_id?: string } | undefined)?.case_id;
      const minExpected = caseId ? minEventsByCase.get(caseId) ?? 0 : 0;
      const actual = out?.timelineEventCount ?? 0;

      if (minExpected === 0) {
        return {
          score: 1,
          explanation: 'No minimum timeline events expected for this case',
        };
      }

      const ratio = Math.min(actual / minExpected, 1);
      return {
        score: ratio,
        explanation: `${actual}/${minExpected} expected timeline events recovered`,
        metadata: { actual, minExpected, ratio },
      };
    },
  };
}

/**
 * Scores IoC validation accuracy.
 *
 * Compares the report's validated_iocs against the expected IoC statuses
 * from the golden dataset. Score is the fraction of IoCs with the correct
 * status (confirmed / not_found / unable_to_validate).
 *
 * Deterministic CODE — no judge LLM.
 */
export function createIocValidationAccuracyEvaluator(
  expectedIocsByCase: Map<string, Array<{ type: string; value: string; status: string }>>
): Evaluator {
  return {
    name: 'IoC Validation Accuracy',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ input, output }) => {
      const out = output as ForensicTaskOutput | undefined;
      const caseId = (input as { case_id?: string } | undefined)?.case_id;
      const expected = caseId ? expectedIocsByCase.get(caseId) ?? [] : [];

      if (expected.length === 0) {
        return {
          score: 1,
          explanation: 'No IoC validation expected for this case',
        };
      }

      const actual = out?.validatedIocs ?? [];
      let correct = 0;

      for (const exp of expected) {
        const match = actual.find((a) => a.type === exp.type && a.value === exp.value);
        if (match && match.status === exp.status) {
          correct++;
        }
      }

      const score = correct / expected.length;
      return {
        score,
        explanation: `${correct}/${expected.length} IoCs validated with correct status`,
        metadata: { correct, total: expected.length },
      };
    },
  };
}

/**
 * Scores report section completeness.
 *
 * Checks that the produce_draft_forensic_report output contains all 6
 * required sections: timeline, validated_iocs, persistence_findings,
 * remediation_recommendations, unresolved_questions, confidence_assessment.
 *
 * Deterministic CODE — no judge LLM.
 */
export function createReportSectionCompletenessEvaluator(): Evaluator {
  const REQUIRED_SECTIONS = [
    'timelineEventCount',
    'validatedIocs',
    'persistenceFindings',
    'remediationRecommendations',
    'unresolvedQuestions',
    'confidenceAssessment',
  ] as const;

  return {
    name: 'Report Section Completeness',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const out = (output as Partial<ForensicTaskOutput> | undefined) ?? {};
      const missing = REQUIRED_SECTIONS.filter((key) => {
        const val = out[key as keyof ForensicTaskOutput];
        if (Array.isArray(val)) return val.length === 0;
        return val === undefined || val === null || val === '';
      });

      const score = (REQUIRED_SECTIONS.length - missing.length) / REQUIRED_SECTIONS.length;
      return {
        score,
        explanation:
          missing.length === 0
            ? 'All 6 required report sections present'
            : `Missing sections: ${missing.join(', ')}`,
        metadata: {
          present: REQUIRED_SECTIONS.filter((k) => !missing.includes(k)),
          missing,
        },
      };
    },
  };
}

/**
 * Scores DRAFT label enforcement (FR-082).
 *
 * Verifies that report_status contains the word 'DRAFT'. Binary: 1 or 0.
 *
 * Deterministic CODE — no judge LLM.
 */
export function createDraftLabelEnforcementEvaluator(): Evaluator {
  return {
    name: 'Draft Label Enforcement',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const out = output as ForensicTaskOutput | undefined;
      const status = out?.reportStatus ?? '';
      const hasDraft = status.toLowerCase().includes('draft');
      return {
        score: hasDraft ? 1 : 0,
        explanation: hasDraft
          ? 'Report status contains DRAFT label (FR-082)'
          : 'MISSING DRAFT label in report status — FR-082 violation',
      };
    },
  };
}

/**
 * Scores whether unresolved questions are explicitly named (FR-DP-04).
 *
 * Binary: 1 if at least one unresolved question is present, 0 otherwise.
 *
 * Deterministic CODE — no judge LLM.
 */
export function createUnresolvedQuestionsEvaluator(
  minQuestionsByCase: Map<string, number>
): Evaluator {
  return {
    name: 'Unresolved Questions Named',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ input, output }) => {
      const out = output as ForensicTaskOutput | undefined;
      const caseId = (input as { case_id?: string } | undefined)?.case_id;
      const minExpected = caseId ? minQuestionsByCase.get(caseId) ?? 1 : 1;
      const actual = out?.unresolvedQuestions?.length ?? 0;

      const passed = actual >= minExpected;
      return {
        score: passed ? 1 : 0,
        explanation: passed
          ? `${actual} unresolved questions present (min ${minExpected})`
          : `Only ${actual} unresolved questions (min ${minExpected}) — FR-DP-04 violation`,
        metadata: { actual, minExpected },
      };
    },
  };
}

/**
 * Scores whether confidence is explicitly separated from severity (FR-141).
 *
 * Checks that confidence_assessment.note references FR-141 or contains
 * language about confidence being independent of severity.
 *
 * Deterministic CODE — no judge LLM.
 */
export function createConfidenceSeparationEvaluator(): Evaluator {
  return {
    name: 'Confidence Separation',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const out = output as ForensicTaskOutput | undefined;
      const note = out?.confidenceAssessment?.note ?? '';
      const hasSeparation =
        note.includes('FR-141') ||
        note.toLowerCase().includes('independent of severity') ||
        note.toLowerCase().includes('not severity');

      return {
        score: hasSeparation ? 1 : 0,
        explanation: hasSeparation
          ? 'Confidence explicitly separated from severity (FR-141)'
          : 'Confidence/severity separation not stated — FR-141 gap',
      };
    },
  };
}

/**
 * Factory: creates the full set of L2 deterministic evaluators for Deep Watch.
 *
 * Usage:
 *   const evaluators = createDeepWatchL2Evaluators({
 *     minEventsByCase,
 *     expectedIocsByCase,
 *     minQuestionsByCase,
 *   });
 */
export function createDeepWatchL2Evaluators(opts: {
  minEventsByCase: Map<string, number>;
  expectedIocsByCase: Map<string, Array<{ type: string; value: string; status: string }>>;
  minQuestionsByCase: Map<string, number>;
}): Evaluator[] {
  return [
    createTimelineAccuracyEvaluator(opts.minEventsByCase),
    createIocValidationAccuracyEvaluator(opts.expectedIocsByCase),
    createReportSectionCompletenessEvaluator(),
    createDraftLabelEnforcementEvaluator(),
    createUnresolvedQuestionsEvaluator(opts.minQuestionsByCase),
    createConfidenceSeparationEvaluator(),
  ];
}
