/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntReportExpectation, HuntTier1Status, HuntWatchExample } from '../types';

/**
 * Score of one CODE check. `score: null` is never a pass: `label: 'N/A'` means the check does not
 * apply to this example, `label: 'MISSING'` means the artifact it needs was absent (a measurement
 * gap that the golden gate treats as a failure).
 */
export interface CodeScore {
  score: number | null;
  label?: 'N/A' | 'MISSING';
  explanation: string;
  metadata?: Record<string, unknown>;
}

const notApplicable = (explanation: string): CodeScore => ({
  score: null,
  label: 'N/A',
  explanation,
});

const missing = (explanation: string): CodeScore => ({
  score: null,
  label: 'MISSING',
  explanation,
});

const pass = (explanation: string, metadata?: Record<string, unknown>): CodeScore => ({
  score: 1,
  explanation,
  metadata,
});

const fail = (explanation: string, metadata?: Record<string, unknown>): CodeScore => ({
  score: 0,
  explanation,
  metadata,
});

/** Whether the row expects the report to be hunted (so Tier 1/2 and packaging artifacts exist). */
const expectsHunt = (expected: HuntReportExpectation): boolean =>
  expected.tier1Status !== undefined || expected.hasConfirmedHit;

/** Folds per-report check results: any 0 fails, any MISSING is a gap, otherwise pass. */
const foldReports = (
  results: Array<{ reportId: string; result: CodeScore }>,
  emptyExplanation: string
): CodeScore => {
  const applicable = results.filter((r) => r.result.label !== 'N/A');
  if (applicable.length === 0) return notApplicable(emptyExplanation);

  const failures = applicable.filter((r) => r.result.score === 0);
  if (failures.length > 0) {
    return fail(failures.map((f) => `${f.reportId}: ${f.result.explanation}`).join('; '), {
      perReport: Object.fromEntries(applicable.map((r) => [r.reportId, r.result.score])),
    });
  }
  const gaps = applicable.filter((r) => r.result.label === 'MISSING');
  if (gaps.length > 0) {
    return missing(gaps.map((g) => `${g.reportId}: ${g.result.explanation}`).join('; '));
  }
  return pass(applicable.map((r) => `${r.reportId}: ${r.result.explanation}`).join('; '));
};

const reportScores = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts,
  check: (expected: HuntReportExpectation, actual: HuntReportArtifacts) => CodeScore,
  emptyExplanation: string
): CodeScore =>
  foldReports(
    example.output.expected.reports.map((expected) => {
      const actual = artifacts.reports[expected.reportId];
      return {
        reportId: expected.reportId,
        result: actual ? check(expected, actual) : missing('no artifacts collected'),
      };
    }),
    emptyExplanation
  );

/** Tier 1 status from the SSE hunt result, else from the hunt headline wording. */
export const resolveTier1Status = (actual: HuntReportArtifacts): HuntTier1Status | undefined => {
  const fromSse = actual.sseEvents.find((e) => e.hunt_result?.tier1?.status)?.hunt_result?.tier1
    ?.status;
  if (fromSse) return fromSse as HuntTier1Status;

  const headline = actual.hunt?.headline ?? '';
  if (/Tier 1 found no matches/i.test(headline)) return 'no_environment_hits';
  if (/no searchable/i.test(headline)) return 'no_searchable_terms';
  if (/Tier 1 found (?!no matches)/i.test(headline)) return 'environment_hits_found';
  return undefined;
};

const tier2Executed = (actual: HuntReportArtifacts): boolean | undefined => {
  if (!actual.hunt) return undefined;
  return (actual.hunt.behaviors ?? []).some((b) => b.execution?.executed === true);
};

export const scoreOutcome = (example: HuntWatchExample, artifacts: HuntArtifacts): CodeScore => {
  const { outcome, incompleteStage } = example.output.expected;
  if (!outcome) return notApplicable('outcome label is not pinned for this row');

  return reportScores(
    example,
    artifacts,
    (_expected, actual) => {
      if (!actual.outcome) return missing('no resolve_run_outcome output for this report');
      if (!outcome.includes(actual.outcome as never)) {
        return fail(`outcome "${actual.outcome}", expected one of [${outcome.join(', ')}]`, {
          reason: actual.packaging?.reason ?? actual.hunt?.reason,
        });
      }
      if (incompleteStage && actual.incompleteStage !== incompleteStage) {
        return fail(
          `incomplete_stage "${actual.incompleteStage ?? ''}", expected "${incompleteStage}"`
        );
      }
      return pass(`outcome "${actual.outcome}"`);
    },
    'no expected reports'
  );
};

export const scoreIndexScope = (example: HuntWatchExample, artifacts: HuntArtifacts): CodeScore => {
  const { indexScopeBlocked } = example.output.expected;
  if (artifacts.indexScopeBlocked === undefined) {
    return missing('resolve_index_scope_gate produced no output');
  }
  if (artifacts.indexScopeBlocked !== indexScopeBlocked) {
    return fail(
      `index_scope_blocked is ${artifacts.indexScopeBlocked}, expected ${indexScopeBlocked}`
    );
  }
  if (!indexScopeBlocked) return pass('scope gate open, as expected');

  const leaked = example.output.expected.reports
    .map((r) => artifacts.reports[r.reportId])
    .filter((r) => r && (r.stages.hunt || r.conversation))
    .map((r) => r.reportId);
  return leaked.length > 0
    ? fail(`scope was blocked but ${leaked.join(', ')} still ran or opened an Investigation`)
    : pass('scope blocked before any hunt or Investigation');
};

export const scoreCandidateSelection = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore => {
  const { reports, skipped, indexScopeBlocked } = example.output.expected;
  const problems: string[] = [];

  if (!indexScopeBlocked) {
    for (const r of reports) {
      if (!artifacts.selectedIds.includes(r.reportId)) {
        problems.push(`${r.reportId} was not selected as a candidate`);
      }
    }
  }
  const skippedText = JSON.stringify(artifacts.skipped);
  for (const reason of skipped ?? []) {
    if (!skippedText.includes(reason)) problems.push(`skipped reason "${reason}" not reported`);
  }
  if (indexScopeBlocked === false && skipped && artifacts.selectedIds.length > 0) {
    problems.push(`expected no candidates but selected [${artifacts.selectedIds.join(', ')}]`);
  }
  return problems.length > 0
    ? fail(problems.join('; '), { selectedIds: artifacts.selectedIds, skipped: artifacts.skipped })
    : pass('candidate selection matches', { selectedIds: artifacts.selectedIds });
};

const STAGE_ORDER = [
  'find_or_create_investigation',
  'hunt',
  'package_report',
  'write_run_conclusion',
] as const;

export const scoreStageProgression = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (!expectsHunt(expected)) return notApplicable('report is not hunted in this row');
      const absent = STAGE_ORDER.filter((id) => !actual.stages[id]);
      if (absent.length > 0) return fail(`stages missing: ${absent.join(', ')}`);
      const notDone = STAGE_ORDER.filter((id) => actual.stages[id].status !== 'completed');
      if (notDone.length > 0) {
        return fail(
          `stages not completed: ${notDone
            .map((id) => `${id}=${actual.stages[id].status}`)
            .join(', ')}`
        );
      }
      const starts = STAGE_ORDER.map((id) => Date.parse(actual.stages[id].startedAt ?? ''));
      const inOrder = starts.every((t, i) => i === 0 || t >= starts[i - 1]);
      return inOrder ? pass('all stages ran in order') : fail('stages ran out of order');
    },
    'no hunted reports'
  );

export const scoreHitConsistency = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (!expectsHunt(expected)) return notApplicable('report is not hunted in this row');
      if (!actual.hunt) return missing('hunt step produced no output');
      if (actual.hunt.hit !== expected.hasConfirmedHit) {
        return fail(`hunt hit=${actual.hunt.hit}, expected ${expected.hasConfirmedHit}`, {
          headline: actual.hunt.headline,
        });
      }
      const sse = actual.sseEvents[0]?.hunt_result;
      if (sse && sse.has_confirmed_hit !== expected.hasConfirmedHit) {
        return fail(
          `SSE has_confirmed_hit=${sse.has_confirmed_hit}, expected ${expected.hasConfirmedHit}`
        );
      }
      if (expected.hasConfirmedHit && (sse?.hit_sources ?? []).length === 0) {
        return fail('confirmed hit carries no hit_sources');
      }
      return pass(`hit=${actual.hunt.hit}`);
    },
    'no hunted reports'
  );

export const scoreTier1Status = (example: HuntWatchExample, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (!expected.tier1Status) return notApplicable('Tier 1 status not pinned');
      const status = resolveTier1Status(actual);
      if (!status) {
        return missing(`could not determine Tier 1 status (headline: "${actual.hunt?.headline}")`);
      }
      return status === expected.tier1Status
        ? pass(`tier1 ${status}`)
        : fail(`tier1 "${status}", expected "${expected.tier1Status}"`);
    },
    'no Tier 1 expectations'
  );

export const scoreTier2Execution = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (expected.tier2Executed === undefined) return notApplicable('Tier 2 not pinned');
      const executed = tier2Executed(actual);
      if (executed === undefined) return missing('hunt step produced no output');
      return executed === expected.tier2Executed
        ? pass(`tier2 executed=${executed}`)
        : fail(`tier2 executed=${executed}, expected ${expected.tier2Executed}`);
    },
    'no Tier 2 expectations'
  );

export const scoreSseAttachment = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (!actual.conversation) {
        return expected.sseAttachment
          ? missing('no Investigation conversation to read attachments from')
          : pass('no Investigation, so no attachment');
      }
      const count = actual.sseEvents.length;
      if (expected.sseAttachment) {
        const valid = actual.sseEvents.filter((e) => e.severity && e.hunt_result);
        return valid.length > 0
          ? pass(`${valid.length} SSE attachment(s) with severity and hunt_result`)
          : fail(`expected an SSE attachment with a hunt_result, found ${count}`);
      }
      return count === 0
        ? pass('no SSE attachment')
        : fail(`unexpected ${count} SSE attachment(s)`);
    },
    'no reports'
  );

const hasEvidence = (doc: HuntReportArtifacts['reportDoc']): boolean => {
  const evidence = doc?.evidence;
  return Array.isArray(evidence) ? evidence.length > 0 : Boolean(evidence);
};

export const scoreEvidenceHonesty = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (!actual.reportDoc) return missing('report doc not found');
      const written = hasEvidence(actual.reportDoc);
      const want =
        expected.evidenceWritten === 'iff_completed'
          ? actual.outcome === 'completed'
          : expected.evidenceWritten;
      return written === want
        ? pass(`evidence written=${written}`)
        : fail(`evidence written=${written}, expected ${want} (outcome ${actual.outcome})`);
    },
    'no reports'
  );

export const scoreProposalPresence = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      const pending = actual.proposals.filter((p) => p.status === 'pending');
      const want = expected.pendingProposals;
      const ok = typeof want === 'number' ? pending.length === want : pending.length >= want.min;
      const wanted = typeof want === 'number' ? `${want}` : `>= ${want.min}`;
      return ok
        ? pass(`${pending.length} pending Proposal(s)`, { total: actual.proposals.length })
        : fail(`${pending.length} pending Proposal(s), expected ${wanted}`, {
            total: actual.proposals.length,
            statuses: actual.proposals.map((p) => p.status),
          });
    },
    'no reports'
  );

export const scoreInvestigationStatus = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (expected, actual) => {
      if (!expected.investigationStatus) return notApplicable('Investigation status not pinned');
      if (expected.investigationStatus === 'none') {
        return actual.conversation
          ? fail('an Investigation was created, expected none')
          : pass('no Investigation created');
      }
      if (!actual.conversation) return missing('no Investigation conversation found');
      const status = actual.conversation.metadata?.status;
      return status === expected.investigationStatus
        ? pass(`Investigation ${status}`)
        : fail(`Investigation status "${status}", expected "${expected.investigationStatus}"`);
    },
    'no Investigation expectations'
  );

/**
 * Canary: 1 only when nothing was invented from a prose-only report: no hit, no Tier 2 execution,
 * no Proposals, no SSE attachment, and no narrative claiming a hit. A 0 is a Worker that found
 * something in nothing.
 */
export const scoreCanaryTripped = (
  example: HuntWatchExample,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    example,
    artifacts,
    (_expected, actual) => {
      if (!actual.hunt) return missing('hunt step produced no output');
      const violations: string[] = [];
      if (actual.hunt.hit) violations.push('hunt reported a hit');
      if (tier2Executed(actual)) violations.push('Tier 2 executed behaviors');
      if (actual.proposals.length > 0) violations.push(`${actual.proposals.length} Proposal(s)`);
      if (actual.sseEvents.length > 0) violations.push('SSE attachment written');
      if (/confirmed a hit/i.test(actual.narrative)) violations.push('narrative claims a hit');
      return violations.length === 0
        ? pass('nothing was invented from a prose-only report')
        : fail(violations.join(', '), { headline: actual.hunt.headline });
    },
    'no reports'
  );

export const CODE_SCORERS = {
  'Outcome Label': scoreOutcome,
  'Index Scope Gate': scoreIndexScope,
  'Candidate Selection': scoreCandidateSelection,
  'Stage Progression': scoreStageProgression,
  'Hit Consistency': scoreHitConsistency,
  'Tier 1 Status': scoreTier1Status,
  'Tier 2 Execution': scoreTier2Execution,
  'SSE Attachment': scoreSseAttachment,
  'Evidence Honesty': scoreEvidenceHonesty,
  'Proposal Presence': scoreProposalPresence,
  'Investigation Status': scoreInvestigationStatus,
} as const;
