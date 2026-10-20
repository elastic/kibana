/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { HuntArtifacts, HuntReportArtifacts } from '../collect';
import type { HuntExpected, HuntReportExpectation, HuntTier1Status } from '../types';

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
  expected: HuntExpected,
  artifacts: HuntArtifacts,
  check: (expected: HuntReportExpectation, actual: HuntReportArtifacts) => CodeScore,
  emptyExplanation: string
): CodeScore =>
  foldReports(
    expected.reports.map((report) => {
      const actual = artifacts.reports[report.reportId];
      return {
        reportId: report.reportId,
        result: actual ? check(report, actual) : missing('no artifacts collected'),
      };
    }),
    emptyExplanation
  );

/** Tier 1 status from the SSE hunt result, else from the hunt headline wording. */
export const resolveTier1Status = (actual: HuntReportArtifacts): HuntTier1Status | undefined => {
  const fromSse = actual.sseEvents.find((e) => e.hunt_result)?.hunt_result?.tier1.status;
  if (fromSse) return fromSse;

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

export const scoreOutcome = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore => {
  const { outcome, incompleteStage } = expected;
  if (!outcome) return notApplicable('outcome label is not pinned for this row');

  return reportScores(
    expected,
    artifacts,
    (_expected, actual) => {
      if (!actual.outcome) return missing('no resolve_run_outcome output for this report');
      if (!outcome.some((accepted) => accepted === actual.outcome)) {
        return fail(`outcome "${actual.outcome}", expected one of [${outcome.join(', ')}]`, {
          reason: actual.packaging?.reason ?? actual.hunt?.reason,
        });
      }
      // A completed run has no incomplete stage, so the pin only binds the runs that stopped.
      if (
        incompleteStage &&
        actual.outcome !== 'completed' &&
        actual.incompleteStage !== incompleteStage
      ) {
        return fail(
          `incomplete_stage "${actual.incompleteStage ?? ''}", expected "${incompleteStage}"`
        );
      }
      return pass(`outcome "${actual.outcome}"`);
    },
    'no expected reports'
  );
};

export const scoreIndexScope = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore => {
  const { indexScopeBlocked } = expected;
  if (artifacts.indexScopeBlocked === undefined) {
    return missing('resolve_index_scope_gate produced no output');
  }
  if (artifacts.indexScopeBlocked !== indexScopeBlocked) {
    return fail(
      `index_scope_blocked is ${artifacts.indexScopeBlocked}, expected ${indexScopeBlocked}`
    );
  }
  if (!indexScopeBlocked) return pass('scope gate open, as expected');

  const leaked = expected.reports
    .map((r) => artifacts.reports[r.reportId])
    .filter((r) => r && (r.stages.hunt || r.conversation))
    .map((r) => r.reportId);
  return leaked.length > 0
    ? fail(`scope was blocked but ${leaked.join(', ')} still ran or opened an Investigation`)
    : pass('scope blocked before any hunt or Investigation');
};

/** `reason` of every `select_candidate_reports` skip entry (`{ id, reason }`). */
const skippedReasons = (skipped: unknown[]): string[] =>
  skipped.flatMap((entry) => {
    const reason = (entry as { reason?: unknown } | null)?.reason;
    return typeof reason === 'string' ? [reason] : [];
  });

export const scoreCandidateSelection = (
  expected: HuntExpected,
  artifacts: HuntArtifacts
): CodeScore => {
  const { reports, skipped, indexScopeBlocked } = expected;
  const problems: string[] = [];

  if (!indexScopeBlocked) {
    for (const r of reports) {
      if (!artifacts.selectedIds.includes(r.reportId)) {
        problems.push(`${r.reportId} was not selected as a candidate`);
      }
    }
  }
  const reasons = skippedReasons(artifacts.skipped);
  for (const reason of skipped ?? []) {
    if (!reasons.includes(reason)) problems.push(`skipped reason "${reason}" not reported`);
  }
  // A row with no report expectations expects nothing to be selected. Keyed on `reports`, not on
  // `skipped`, so a row can name both a selected report and a skipped one.
  if (!indexScopeBlocked && reports.length === 0 && artifacts.selectedIds.length > 0) {
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
  expected: HuntExpected,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!expectsHunt(report)) return notApplicable('report is not hunted in this row');
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
      const unstamped = STAGE_ORDER.filter((id) => !actual.stages[id].startedAt);
      if (unstamped.length > 0) {
        return missing(`stages without startedAt: ${unstamped.join(', ')}`);
      }
      const starts = STAGE_ORDER.map((id) => Date.parse(actual.stages[id].startedAt ?? ''));
      const inOrder = starts.every((t, i) => i === 0 || t >= starts[i - 1]);
      return inOrder ? pass('all stages ran in order') : fail('stages ran out of order');
    },
    'no hunted reports'
  );

export const scoreHitConsistency = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!expectsHunt(report)) return notApplicable('report is not hunted in this row');
      if (!actual.hunt) return missing('hunt step produced no output');
      if (actual.hunt.hit !== report.hasConfirmedHit) {
        return fail(`hunt hit=${actual.hunt.hit}, report ${report.hasConfirmedHit}`, {
          headline: actual.hunt.headline,
        });
      }
      const sse = actual.sseEvents.find((e) => e.hunt_result)?.hunt_result;
      if (sse && sse.has_confirmed_hit !== report.hasConfirmedHit) {
        return fail(
          `SSE has_confirmed_hit=${sse.has_confirmed_hit}, report ${report.hasConfirmedHit}`
        );
      }
      if (report.hasConfirmedHit && sse?.hit_sources.length === 0) {
        return fail('confirmed hit carries no hit_sources');
      }
      return pass(`hit=${actual.hunt.hit}`);
    },
    'no hunted reports'
  );

export const scoreTier1Status = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!report.tier1Status) return notApplicable('Tier 1 status not pinned');
      const status = resolveTier1Status(actual);
      if (!status) {
        return missing(`could not determine Tier 1 status (headline: "${actual.hunt?.headline}")`);
      }
      return status === report.tier1Status
        ? pass(`tier1 ${status}`)
        : fail(`tier1 "${status}", report "${report.tier1Status}"`);
    },
    'no Tier 1 expectations'
  );

export const scoreTier2Execution = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (report.tier2Executed === undefined) return notApplicable('Tier 2 not pinned');
      const executed = tier2Executed(actual);
      if (executed === undefined) return missing('hunt step produced no output');
      return executed === report.tier2Executed
        ? pass(`tier2 executed=${executed}`)
        : fail(`tier2 executed=${executed}, report ${report.tier2Executed}`);
    },
    'no Tier 2 expectations'
  );

export const scoreSseAttachment = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!actual.conversation) {
        return report.sseAttachment
          ? missing('no Investigation conversation to read attachments from')
          : pass('no Investigation, so no attachment');
      }
      const count = actual.sseEvents.length;
      if (report.sseAttachment) {
        const invalid = actual.sseEvents.filter((e) => e.hunt_result_error);
        if (invalid.length > 0) {
          return fail(
            `${invalid.length} SSE attachment(s) failed huntResultSchema: ${invalid
              .map((e) => e.hunt_result_error)
              .join('; ')}`
          );
        }
        const valid = actual.sseEvents.filter((e) => e.severity && e.hunt_result);
        return valid.length > 0
          ? pass(`${valid.length} SSE attachment(s) with severity and a valid hunt_result`)
          : fail(`report an SSE attachment with a hunt_result, found ${count}`);
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

export const scoreEvidenceHonesty = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!actual.reportDoc) return missing('report doc not found');
      const written = hasEvidence(actual.reportDoc);
      // The flag the hunt child's `write_evidence` step keys off: true for `complete` and
      // `incomplete_final`, false for `incomplete_retryable`, absent when no coordinator read
      // completed. The child's own `status` is `partial` for both incomplete kinds, so it cannot
      // tell a retired-with-incomplete-evidence hunt from one that wrote nothing.
      const completedSuccessfully = actual.coordinator?.completed_successfully === true;
      const completeness =
        typeof actual.coordinator?.completeness === 'string'
          ? actual.coordinator.completeness
          : 'absent';
      const want =
        report.evidenceWritten === 'iff_completed_successfully'
          ? completedSuccessfully
          : report.evidenceWritten;
      const context = `coordinator ${completeness}, hunt ${actual.hunt?.status}, outcome ${actual.outcome}`;
      return written === want
        ? pass(`evidence written=${written} (${context})`)
        : fail(`evidence written=${written}, report ${want} (${context})`);
    },
    'no reports'
  );

export const scoreProposalPresence = (
  expected: HuntExpected,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      const want = report.pendingProposals;
      if (want === undefined) return notApplicable('Proposal count not pinned');
      if (want === 0) {
        // A Proposal the run minted and then executed is `executing` or `succeeded`, never
        // `pending`, so a zero row checks that this run created nothing in any status. Earlier
        // runs' settled Proposals share the Investigation id and are excluded by creation time.
        const runStart = Date.parse(artifacts.runStartedAt);
        const minted = actual.proposals.filter((p) => Date.parse(p.createdAt) >= runStart);
        return minted.length === 0
          ? pass('no Proposal created by this run', { total: actual.proposals.length })
          : fail(`${minted.length} Proposal(s) created by this run, report 0`, {
              total: actual.proposals.length,
              statuses: minted.map((p) => p.status),
            });
      }
      const pending = actual.proposals.filter((p) => p.status === 'pending');
      const ok = typeof want === 'number' ? pending.length === want : pending.length >= want.min;
      const wanted = typeof want === 'number' ? `${want}` : `>= ${want.min}`;
      return ok
        ? pass(`${pending.length} pending Proposal(s)`, { total: actual.proposals.length })
        : fail(`${pending.length} pending Proposal(s), report ${wanted}`, {
            total: actual.proposals.length,
            statuses: actual.proposals.map((p) => p.status),
          });
    },
    'no reports'
  );

export const scoreInvestigationStatus = (
  expected: HuntExpected,
  artifacts: HuntArtifacts
): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!report.investigationStatus) return notApplicable('Investigation status not pinned');
      if (report.investigationStatus === 'none') {
        return actual.conversation
          ? fail('an Investigation was created, report none')
          : pass('no Investigation created');
      }
      if (!actual.conversation) return missing('no Investigation conversation found');
      const status = actual.conversation.metadata?.status;
      return status === report.investigationStatus
        ? pass(`Investigation ${status}`)
        : fail(`Investigation status "${status}", report "${report.investigationStatus}"`);
    },
    'no Investigation expectations'
  );

/**
 * Canary: 1 only when the hunt ran to a verdict and invented nothing from a prose-only report:
 * Tier 1 reports the pinned `no_searchable_terms`, no hit, no Tier 2 execution, no Proposals, no
 * SSE attachment, and no narrative claiming a hit. A 0 is a Worker that found something in
 * nothing, or one that failed before it could be judged: a hunt that never ran also invented
 * nothing, and must not look like a correct rejection.
 */
export const scoreCanaryTripped = (expected: HuntExpected, artifacts: HuntArtifacts): CodeScore =>
  reportScores(
    expected,
    artifacts,
    (report, actual) => {
      if (!actual.hunt) return missing('hunt step produced no output');
      if (actual.outcome === 'failed' || actual.hunt.status === 'failed') {
        return fail(
          `hunt did not reach a verdict (hunt ${actual.hunt.status}, outcome ${actual.outcome})`,
          { reason: actual.hunt.reason }
        );
      }
      const violations: string[] = [];
      if (report.tier1Status) {
        const status = resolveTier1Status(actual);
        if (!status) {
          return missing(`could not determine Tier 1 status (headline: "${actual.hunt.headline}")`);
        }
        if (status !== report.tier1Status) {
          violations.push(`tier1 "${status}", report "${report.tier1Status}"`);
        }
      }
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

/**
 * Actioned Proposals only: recommendations are keyed per Investigation and are expected to
 * duplicate across reports. Target paths match packaging's `holdsSubject` contract, and the
 * criticality level is part of the subject for the same reason packaging's `coversCriticality`
 * makes it one: a finding that wants a higher level than the live Proposal asks for is minted on
 * its own rather than absorbed, so two levels on one target is the product working, not a miss.
 */
export const actionedSubjectFingerprint = (proposal: ProposalWithMetadata): string | undefined => {
  if (!proposal.actionWorkflowId) return undefined;
  const input = proposal.actionInput ?? {};
  const endpointIds = input.endpoint_ids;
  const parameters =
    input.parameters && typeof input.parameters === 'object'
      ? (input.parameters as Record<string, unknown>)
      : undefined;
  return [
    proposal.actionWorkflowId,
    typeof input.id_field === 'string' ? input.id_field : '',
    typeof input.id_value === 'string' ? input.id_value : '',
    Array.isArray(endpointIds) ? endpointIds.join(',') : '',
    typeof parameters?.entity_id === 'string' ? parameters.entity_id : '',
    typeof input.criticality_level === 'string' ? input.criticality_level : '',
  ].join('|');
};

const CONVERGENCE_TEXT =
  /no second Proposal was created|already raised by another Investigation|Also raised by \[Investigation\]/;

const investigationTexts = (report: HuntReportArtifacts): string =>
  [
    report.packaging?.summary,
    report.narrative,
    ...(report.conversation?.events ?? []).map((e) => e.data?.message),
  ]
    .filter((text): text is string => typeof text === 'string' && text.length > 0)
    .join('\n');

/**
 * Cross-Investigation Proposal convergence for multi-candidate rows that share principals.
 * Fails when the same actioned subject is pending under more than one Investigation, or when
 * no Investigation / Proposal records the packaging convergence note.
 */
export const scoreProposalConvergence = (
  expected: HuntExpected,
  artifacts: HuntArtifacts
): CodeScore => {
  if (!expected.proposalConvergence) {
    return notApplicable('Proposal convergence not pinned for this row');
  }

  const hitReports = expected.reports.filter((r) => r.hasConfirmedHit);
  if (hitReports.length < 2) {
    return fail('proposalConvergence requires at least two hit reports in the expectation');
  }

  const reportIds = new Set(hitReports.map((r) => r.reportId));
  const conversationIds = new Set(
    [...reportIds]
      .map((id) => artifacts.reports[id]?.conversation?.id)
      .filter((id): id is string => typeof id === 'string')
  );
  if (conversationIds.size < 2) {
    return missing(
      `need Investigations for at least two hit reports, found ${conversationIds.size}`
    );
  }

  const pendingActioned = artifacts.pendingProposalsInSpace.filter(
    (p) =>
      p.status === 'pending' && Boolean(p.actionWorkflowId) && conversationIds.has(p.conversationId)
  );

  const bySubject = new Map<string, Set<string>>();
  for (const proposal of pendingActioned) {
    const fingerprint = actionedSubjectFingerprint(proposal);
    if (fingerprint) {
      const owners = bySubject.get(fingerprint) ?? new Set<string>();
      owners.add(proposal.conversationId);
      bySubject.set(fingerprint, owners);
    }
  }

  const duplicated = [...bySubject.entries()].filter(([, owners]) => owners.size > 1);
  if (duplicated.length > 0) {
    return fail(
      `same actioned subject pending under ${duplicated.length} duplicate Investigation group(s)`,
      {
        subjects: duplicated.map(([subject, owners]) => ({
          subject,
          conversationIds: [...owners],
        })),
      }
    );
  }

  if (bySubject.size === 0) {
    return missing(
      'no pending actioned Proposals on the hit Investigations, so convergence cannot be observed'
    );
  }

  const noteOnInvestigation = [...reportIds].some((id) => {
    const report = artifacts.reports[id];
    return report ? CONVERGENCE_TEXT.test(investigationTexts(report)) : false;
  });
  const noteOnProposal = pendingActioned.some((p) => CONVERGENCE_TEXT.test(p.comment ?? ''));
  if (!noteOnInvestigation && !noteOnProposal) {
    return fail(
      'actioned subjects were unique across Investigations, but no convergence note or "Also raised by [Investigation]" line was found',
      { subjects: [...bySubject.keys()], conversationIds: [...conversationIds] }
    );
  }

  return pass(
    `${bySubject.size} actioned subject(s) minted once across ${conversationIds.size} Investigations; convergence recorded`,
    {
      subjects: [...bySubject.keys()],
      noteOnInvestigation,
      noteOnProposal,
    }
  );
};

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
  'Proposal Convergence': scoreProposalConvergence,
  'Investigation Status': scoreInvestigationStatus,
} as const;
