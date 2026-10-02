/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type {
  PackageReportInput,
  PackageReportOutput,
} from '../../../../../common/step_types/package_report';
import type { ResolveHostEnrollment } from '../../../fleet/resolve_host_enrollment';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import { decidePackageReport } from './decide_package_report';
import { deriveCoverageSubjects } from './derive_coverage_subjects';
import { readCurrentRunState } from './read_current_run_state';
import type { RehydrateProcessSelectors } from './rehydrate_process_selectors';
import type { CoverageSubject, CoverageWriteResult } from './types';

export class PackageReportIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackageReportIdentityError';
  }
}

export type ListRespondActions = (
  spaceId: string
) => Promise<{ ok: true; actions: ActionCatalogEntry[] } | { ok: false; reason: 'catalog_error' }>;

export type WriteCoverageKis = (subjects: CoverageSubject[]) => Promise<CoverageWriteResult>;

type MintSuppression = Extract<PackageReportOutput, { status: 'packaged' }>['mintSuppression'];

/**
 * Count of Proposals the Investigation already carries (any status, including settled), before
 * this run's own proposals are minted. Used two ways: greater than zero means a rerun that reaches
 * the same Investigation (reopened, or re-hunted after the hunt-once gate clears) would otherwise
 * mint a second, independent chain for what may be the very same finding -- `decidePackageReport`'s
 * `subjectKey` is deterministic per finding, but nothing downstream of this step dedupes on it yet,
 * so the guard here is coarse, suppressing every new Proposal this run would mint, not only ones
 * that collide with an existing `subjectKey`. It is also the baseline `expectedProposalCount` is
 * built on (see below), so the settlement barrier each gate checks accounts for proposals that
 * already existed before this run, not just the ones this run mints. See the implementation
 * (`check_existing_proposals.ts`) for which statuses count as "existing" and why.
 */
export type CountExistingProposals = (investigationConversationId: string) => Promise<number>;

export interface RunPackageReportDeps {
  listRespondActions: ListRespondActions;
  writeCoverageKis: WriteCoverageKis;
  resolveHostEnrollment: ResolveHostEnrollment;
  rehydrateProcessSelectors: RehydrateProcessSelectors;
  countExistingProposals: CountExistingProposals;
}

/**
 * The settlement barrier threshold each gate checks before closing the Investigation
 * (`hunt_proposal_gate.yaml`'s `created_count >= expectedProposalCount`). Baselined on
 * `existingProposalCount` rather than just `newProposalCount`: nothing on a Proposal records
 * which run minted it, so a gate's `created_count` is always the Investigation's all-time total,
 * never scoped to a single run. Comparing that all-time total against only this run's new-proposal
 * count would let the barrier be satisfied by an earlier run's history alone, before this run's
 * own proposals exist. The baseline makes the barrier track what it actually means: the all-time
 * total has to reach "everything that existed before this run, plus everything this run adds."
 *
 * Exported and kept as a pure function, separate from the suppression decision above, specifically
 * so it can be tested with `existingProposalCount > 0` and `mintSuppression: 'none'` together --
 * a combination `runPackageReport` cannot currently produce (the existing-Proposals guard above
 * suppresses minting entirely whenever any Proposal already exists, so in every case this
 * actually runs today, `existingProposalCount` is 0 and this collapses to `newProposalCount`).
 * That makes it dead weight today, but load-bearing for elastic/security-team#19822: once that
 * phase replaces the coarse guard with real per-finding dedup, a new Proposal minting alongside
 * an Investigation's older ones becomes exactly the case this formula exists for. Do not simplify
 * this back to `newProposalCount` because it looks unreachable -- that is the bug this type was
 * fixing.
 */
export const computeExpectedProposalCount = ({
  mintSuppression,
  existingProposalCount,
  newProposalCount,
}: {
  mintSuppression: MintSuppression;
  existingProposalCount: number;
  newProposalCount: number;
}): number => (mintSuppression === 'none' ? existingProposalCount + newProposalCount : 0);

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

  const state = await readCurrentRunState({
    attachments,
    reportId,
    runId,
    resolveHostEnrollment: deps.resolveHostEnrollment,
    rehydrateProcessSelectors: deps.rehydrateProcessSelectors,
  });

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
      return {
        status: 'packaged',
        coverage: { written: [], skipped: [] },
        proposals: [],
        dismiss: true,
        closureSummary: `Hunt for report ${reportId} found no confirmed hits. Closing: nothing in this environment matched the report at the confirming-index bar.`,
        expectedProposalCount: 0,
        mintSuppression: 'none',
      };
    }
    return {
      status: 'run_incomplete',
      reason: hasConfirmedHit
        ? `No current-run SSE attachment for runId=${runId}`
        : `Hunt did not complete (status=${huntStatus}), so there is no verdict to record for runId=${runId}`,
    };
  }

  const catalog = await deps.listRespondActions(spaceId);
  const decided = decidePackageReport({
    conversationId: investigationConversationId,
    state,
    catalog,
  });

  const subjects = deriveCoverageSubjects({
    spaceId,
    state,
    investigationConversationId,
  });
  const coverage = await deps.writeCoverageKis(subjects);

  // Only a run that would otherwise mint something needs the lookup: a dismissal (no confirmed
  // hit) has no proposals to suppress, and `decidePackageReport` never returns `dismiss: false`
  // with an empty `proposals` (the analyst-recommendation fallback always fills it).
  let mintSuppression: MintSuppression = 'none';
  let existingProposalCount = 0;
  if (!decided.dismiss) {
    try {
      existingProposalCount = await deps.countExistingProposals(investigationConversationId);
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

  // Threaded through to the packaging workflow's per-Proposal gate fan-out as a plain
  // workflow input (`hunt_package_report.yaml`'s `dispatch_gate` step) — the settlement
  // barrier each gate checks before closing the Investigation. Not persisted to
  // conversation metadata: the platform `investigation` template's schema has no room
  // for it.
  const expectedProposalCount = computeExpectedProposalCount({
    mintSuppression,
    existingProposalCount,
    newProposalCount: proposals.length,
  });

  return {
    status: 'packaged',
    coverage,
    proposals,
    // Not forced to `true`: a confirmed hit the guard suppressed is not benign. Accepted
    // consequence, not an oversight: `decidePackageReport` could not previously return
    // `dismiss: false` with an empty `proposals` (it always filled at least the
    // analyst-recommendation fallback), so every non-dismiss run had a gate that would eventually
    // close the Investigation. A suppressed run has none -- if the Investigation's only existing
    // Proposal already settled before this run, nothing here re-closes it, and it stays open until
    // an analyst does so by hand. That is intentional for this guard, matching "reopen
    // Investigations on rerun"'s own goal of keeping a possibly-new finding visible rather than
    // silently closed; elastic/security-team#19822 (phase 3) resolves it as a side effect of real
    // per-finding dedup, not as a standalone fix.
    dismiss: decided.dismiss,
    closureSummary: decided.closureSummary,
    expectedProposalCount,
    mintSuppression,
  };
};
