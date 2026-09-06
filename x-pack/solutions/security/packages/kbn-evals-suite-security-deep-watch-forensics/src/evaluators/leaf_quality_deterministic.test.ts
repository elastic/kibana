/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L2 Deterministic Quality — Deep Watch Forensics
 *
 * Per PR #35: "No LLM below L3." This spec uses deterministic CODE evaluators
 * only — no agentBuilderClient.converse(), no LLM-as-judge.
 *
 * It feeds synthetic tool-output fixtures (matching the shape that
 * produce_draft_forensic_report returns) through the evaluator functions and
 * asserts the scores match expectations. This is unit-level verification of
 * the evaluators themselves and the report structure.
 */

import {
  createTimelineAccuracyEvaluator,
  createIocValidationAccuracyEvaluator,
  createReportSectionCompletenessEvaluator,
  createDraftLabelEnforcementEvaluator,
  createUnresolvedQuestionsEvaluator,
  createConfidenceSeparationEvaluator,
} from '.';
import { FORENSIC_CASES } from '../dataset';
import type { ForensicTaskOutput, ForensicExample } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a well-formed report output from a dataset example. */
function buildWellFormedReport(example: ForensicExample): ForensicTaskOutput {
  return {
    reportStatus: 'DRAFT — Pending Specialist Review (FR-082)',
    scope: {
      hosts: example.input.hosts,
      time_window_hours: example.input.time_window_hours,
      mitre_techniques: example.input.mitre_techniques,
    },
    timelineEventCount: example.output.minTimelineEvents,
    validatedIocs: example.output.expectedIocs.map((ioc) => ({
      type: ioc.type,
      value: ioc.value,
      status: ioc.status,
      source_event: 'test-source',
    })),
    persistenceFindings: 'Registry run keys detected on scoped hosts',
    remediationRecommendations: ['Isolate affected hosts — defer to endpoint-response-actions'],
    unresolvedQuestions: [
      'Earliest recovered event may not be patient zero',
      ...Array.from(
        { length: Math.max(0, example.output.minUnresolvedQuestions - 1) },
        (_, i) => `Question ${i + 2}`
      ),
    ],
    confidenceAssessment: {
      overall: 'medium',
      rationale: 'Moderate telemetry coverage',
      note: 'Confidence is independent of severity (FR-141). A high-severity finding may have low confidence.',
    },
  };
}

/** Build a malformed report missing key sections. */
function buildMalformedReport(): ForensicTaskOutput {
  return {
    reportStatus: 'Final Report',
    timelineEventCount: 0,
    validatedIocs: [],
  };
}

/** Minimal evaluator call wrapper that satisfies the evaluate contract. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evalCall(input: any, output: any): any {
  return {
    input,
    output,
    expected: {},
    metadata: {},
  };
}

// ── Evaluator maps ───────────────────────────────────────────────────────────

const minEventsByCase = new Map(FORENSIC_CASES.map((c) => [c.id, c.output.minTimelineEvents]));
const expectedIocsByCase = new Map(FORENSIC_CASES.map((c) => [c.id, c.output.expectedIocs]));
const minQuestionsByCase = new Map(
  FORENSIC_CASES.map((c) => [c.id, c.output.minUnresolvedQuestions])
);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('L2 Deterministic Evaluators — Deep Watch Forensics', () => {
  // ── TimelineAccuracy ──────────────────────────────────────────────────────

  describe('TimelineAccuracy', () => {
    const evaluator = createTimelineAccuracyEvaluator(minEventsByCase);
    const firstCase = FORENSIC_CASES[0];

    it('scores 1.0 when timeline meets the minimum', async () => {
      const result = await evaluator.evaluate!(
        evalCall({ case_id: firstCase.id }, buildWellFormedReport(firstCase))
      );
      expect(result.score).toBe(1);
    });

    it('scores below 1.0 when timeline is under the minimum', async () => {
      const report = buildWellFormedReport(firstCase);
      report.timelineEventCount = 0;
      const result = await evaluator.evaluate!(evalCall({ case_id: firstCase.id }, report));
      expect(result.score).toBeLessThan(1);
    });

    it('scores 1.0 for a case with no expected events', async () => {
      const result = await evaluator.evaluate!(
        evalCall({ case_id: 'unknown-case' }, { timelineEventCount: 0 })
      );
      expect(result.score).toBe(1);
    });
  });

  // ── IocValidationAccuracy ─────────────────────────────────────────────────

  describe('IocValidationAccuracy', () => {
    const evaluator = createIocValidationAccuracyEvaluator(expectedIocsByCase);
    const firstCase = FORENSIC_CASES[0];

    it('scores 1.0 when all IoC statuses match expected', async () => {
      const result = await evaluator.evaluate!(
        evalCall({ case_id: firstCase.id }, buildWellFormedReport(firstCase))
      );
      expect(result.score).toBe(1);
    });

    it('scores below 1.0 when some IoC statuses differ', async () => {
      const report = buildWellFormedReport(firstCase);
      if (report.validatedIocs.length > 0) {
        report.validatedIocs[0].status =
          report.validatedIocs[0].status === 'confirmed' ? 'not_found' : 'confirmed';
      }
      const result = await evaluator.evaluate!(evalCall({ case_id: firstCase.id }, report));
      expect(result.score).toBeLessThan(1);
    });
  });

  // ── ReportSectionCompleteness ─────────────────────────────────────────────

  describe('ReportSectionCompleteness', () => {
    const evaluator = createReportSectionCompletenessEvaluator();

    it('scores 1.0 when all 6 sections present', async () => {
      const result = await evaluator.evaluate!(
        evalCall({}, buildWellFormedReport(FORENSIC_CASES[0]))
      );
      expect(result.score).toBe(1);
    });

    it('scores below 1.0 when sections are missing', async () => {
      const result = await evaluator.evaluate!(evalCall({}, buildMalformedReport()));
      expect(result.score).toBeLessThan(1);
    });
  });

  // ── DraftLabelEnforcement ─────────────────────────────────────────────────

  describe('DraftLabelEnforcement', () => {
    const evaluator = createDraftLabelEnforcementEvaluator();

    it('scores 1 when DRAFT is in report_status', async () => {
      const result = await evaluator.evaluate!(
        evalCall({}, { reportStatus: 'DRAFT — Pending Review (FR-082)' })
      );
      expect(result.score).toBe(1);
    });

    it('scores 0 when DRAFT is missing from report_status', async () => {
      const result = await evaluator.evaluate!(evalCall({}, { reportStatus: 'Final Report' }));
      expect(result.score).toBe(0);
    });

    it('scores 0 when report_status is missing entirely', async () => {
      const result = await evaluator.evaluate!(evalCall({}, {}));
      expect(result.score).toBe(0);
    });
  });

  // ── UnresolvedQuestionsNamed ──────────────────────────────────────────────

  describe('UnresolvedQuestionsNamed', () => {
    const evaluator = createUnresolvedQuestionsEvaluator(minQuestionsByCase);
    const firstCase = FORENSIC_CASES[0];

    it('scores 1 when unresolved questions meet minimum', async () => {
      const result = await evaluator.evaluate!(
        evalCall({ case_id: firstCase.id }, buildWellFormedReport(firstCase))
      );
      expect(result.score).toBe(1);
    });

    it('scores 0 when no unresolved questions present', async () => {
      const result = await evaluator.evaluate!(
        evalCall({ case_id: firstCase.id }, { unresolvedQuestions: [] })
      );
      expect(result.score).toBe(0);
    });
  });

  // ── ConfidenceSeparation ──────────────────────────────────────────────────

  describe('ConfidenceSeparation', () => {
    const evaluator = createConfidenceSeparationEvaluator();

    it('scores 1 when FR-141 note is present', async () => {
      const result = await evaluator.evaluate!(
        evalCall(
          {},
          {
            confidenceAssessment: {
              overall: 'medium',
              rationale: 'test',
              note: 'Confidence is independent of severity (FR-141)',
            },
          }
        )
      );
      expect(result.score).toBe(1);
    });

    it('scores 0 when FR-141 note is missing', async () => {
      const result = await evaluator.evaluate!(
        evalCall(
          {},
          {
            confidenceAssessment: {
              overall: 'medium',
              rationale: 'test',
            },
          }
        )
      );
      expect(result.score).toBe(0);
    });
  });
});
