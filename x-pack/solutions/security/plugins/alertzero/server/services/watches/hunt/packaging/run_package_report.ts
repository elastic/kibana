/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type {
  PackageReportInput,
  PackageReportOutput,
} from '../../../../../common/step_types/package_report';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import { decidePackageReport } from './decide_package_report';
import { deriveCoverageSubjects } from './derive_coverage_subjects';
import { readCurrentRunState } from './read_current_run_state';
import type { CoverageSubject, CoverageWriteResult } from './types';

export class PackageReportIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackageReportIdentityError';
  }
}

export type WriteCoverageKis = (subjects: CoverageSubject[]) => Promise<CoverageWriteResult>;

type PackagedOutput = Extract<PackageReportOutput, { status: 'packaged' }>;
type MintSuppression = PackagedOutput['mintSuppression'];
type DismissSuppression = PackagedOutput['dismissSuppression'];

/**
 * Whether a clean run may close its Investigation as benign. Not when the Investigation already
 * carries a Proposal from an earlier run: that earlier run found something, an approved handoff
 * may still have Forensics Watch writing its report here, and the hunt-once gate does not stop a
 * manual replay from reaching this path. Fails closed on a lookup error for the same reason the
 * mint guard does -- the one case it must not mishandle is the one where it cannot tell.
 */
const resolveDismissSuppression = async (
  countExistingProposals: CountExistingProposals,
  investigationConversationId: string
): Promise<DismissSuppression> => {
  try {
    const existing = await countExistingProposals(investigationConversationId);
    return existing > 0 ? 'existing_proposals' : 'none';
  } catch {
    return 'check_failed';
  }
};

/**
 * Count of Proposals the Investigation already carries (any status, including settled), before
 * this run's own proposals are minted. Greater than zero means a rerun that reaches the same
 * Investigation (reopened, or re-hunted after the hunt-once gate clears) would otherwise mint a
 * second, independent chain for what may be the very same finding -- `decidePackageReport`'s
 * `subjectKey` is deterministic per finding, but nothing downstream of this step dedupes on it
 * yet, so the guard here is coarse, suppressing every new Proposal this run would mint, not only
 * ones that collide with an existing `subjectKey`. See the implementation
 * (`check_existing_proposals.ts`) for which statuses count as "existing" and why.
 */
export type CountExistingProposals = (investigationConversationId: string) => Promise<number>;

export interface RunPackageReportDeps {
  writeCoverageKis: WriteCoverageKis;
  countExistingProposals: CountExistingProposals;
}

/**
 * Orchestrates packaging for one Investigation run. Throws
 * {@link PackageReportIdentityError} when the conversation id does not match the report
 * binding; returns typed `run_incomplete` when the run claimed a hit whose current-run SSE
 * state cannot be read, and when a hunt that did not complete left nothing to package.
 */
export const runPackageReport = async ({
  spaceId,
  reportId,
  investigationConversationId,
  runId,
  huntStatus,
  hasConfirmedHit,
  attachments,
  deps,
}: {
  spaceId: string;
  reportId: string;
  investigationConversationId: string;
  runId: string;
  huntStatus: PackageReportInput['huntStatus'];
  hasConfirmedHit: boolean;
  attachments: VersionedAttachment[] | undefined;
  deps: RunPackageReportDeps;
}): Promise<PackageReportOutput> => {
  const expectedId = buildHuntInvestigationConversationId(reportId);
  if (investigationConversationId !== expectedId) {
    throw new PackageReportIdentityError(
      `investigationConversationId does not match hunt:report:${reportId} binding`
    );
  }

  const state = readCurrentRunState({ attachments, reportId, runId });

  if (!state) {
    // The coordinator emits an SSE attachment only for a confirmed hit, so a run that
    // cleared no hit legitimately has no current-run state to read. That is the normal
    // outcome of a hunt and has to close the Investigation, not strand it: treat it as a
    // dismissal. Reaching here with a confirmed hit means the state really is missing
    // (a rerun colliding on the attachment id, or a failed attach), which stays
    // `run_incomplete` so the Worker reports the sweep as partial.
    //
    // Only a hunt that completed may close, though. The hunt-once gate keys on
    // `evidence.last_hunted_at`, which the hunt writes only for a run it considers
    // recorded, so a retryable-incomplete or failed run leaves its report eligible and a
    // later sweep hunts it again. Closing here would have that sweep write its findings --
    // a real hit included -- into an Investigation this run had already closed.
    if (!hasConfirmedHit && huntStatus === 'success') {
      // No SSE means no technique-level detail either, so this writes the same report-scoped
      // fallback subject `deriveCoverageSubjects` already emits when a run's SSE names no
      // techniques -- the one piece of "we looked" this run can honestly claim is the reportId.
      const subjects = deriveCoverageSubjects({
        spaceId,
        state: { reportId, techniques: [], hasConfirmedHit: false, corroboratedTechniques: [] },
        investigationConversationId,
      });
      const coverage = await deps.writeCoverageKis(subjects);
      const dismissSuppression = await resolveDismissSuppression(
        deps.countExistingProposals,
        investigationConversationId
      );
      return {
        status: 'packaged',
        coverage,
        proposals: [],
        dismiss: dismissSuppression === 'none',
        closureSummary: `Hunt for report ${reportId} found no confirmed hits. Closing: nothing in this environment matched the report at the confirming-index bar.`,
        mintSuppression: 'none',
        dismissSuppression,
      };
    }
    return {
      status: 'run_incomplete',
      reason: hasConfirmedHit
        ? `No current-run SSE attachment for runId=${runId}`
        : `Hunt did not complete (status=${huntStatus}), so there is no verdict to record for runId=${runId}`,
    };
  }

  const decided = decidePackageReport({
    conversationId: investigationConversationId,
    spaceId,
    reportId,
    runId,
    state,
  });

  const subjects = deriveCoverageSubjects({
    spaceId,
    state,
    investigationConversationId,
  });
  const coverage = await deps.writeCoverageKis(subjects);

  // A clean run with an SSE (an entry that cleared no hit) closes benign on the same condition
  // as the no-SSE clean path above; a hit runs the mint guard instead. One lookup either way.
  // `decidePackageReport` never returns `dismiss: false` with an empty `proposals` (the
  // analyst-recommendation fallback always fills it).
  let mintSuppression: MintSuppression = 'none';
  let dismissSuppression: DismissSuppression = 'none';
  if (decided.dismiss) {
    dismissSuppression = await resolveDismissSuppression(
      deps.countExistingProposals,
      investigationConversationId
    );
  } else {
    try {
      const existingProposalCount = await deps.countExistingProposals(investigationConversationId);
      mintSuppression = existingProposalCount > 0 ? 'existing_proposals' : 'none';
    } catch {
      // Fails closed: the guard's job is to never let a duplicate mint through, so the one case
      // it must not mishandle is the one where it cannot tell. But a lookup failure is not "a
      // Proposal already exists" -- kept distinguishable so the summary below never asserts a
      // cause it never actually observed.
      mintSuppression = 'check_failed';
    }
  }
  const proposals = mintSuppression === 'none' ? decided.proposals : [];

  return {
    status: 'packaged',
    coverage,
    proposals,
    // Not forced to `true`: a confirmed hit the guard suppressed is not benign. A suppressed
    // run mints no gate, and the Investigation it reached stays open for an analyst to review
    // the existing Proposal -- which is also where an approved handoff leaves it, so nothing
    // here closes work Forensics Watch may still be writing into. elastic/security-team#19822
    // (phase 3) replaces this coarse guard with real per-finding dedup.
    dismiss: decided.dismiss && dismissSuppression === 'none',
    closureSummary: decided.closureSummary,
    mintSuppression,
    dismissSuppression,
  };
};
