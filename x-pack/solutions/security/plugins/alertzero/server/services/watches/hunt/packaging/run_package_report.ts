/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type {
  ConvergedProposal,
  PackageReportInput,
  PackageReportMintPayload,
  PackageReportOutput,
} from '../../../../../common/step_types/package_report';
import type { ResolveHostEnrollment } from '../../../fleet/resolve_host_enrollment';
import { buildHuntInvestigationConversationId } from '../common/hunt_investigation_id';
import type { AppendAlsoRaisedBy } from './converge_on_live_proposal';
import { buildConvergenceNote } from './converge_on_live_proposal';
import { buildProposalSummaryBullets, decidePackageReport } from './decide_package_report';
import {
  buildCleanInvestigationSummary,
  buildInvestigationSummary,
} from './build_investigation_summary';
import { deriveCleanCoverageSubjects } from './derive_clean_coverage_subjects';
import { deriveCoverageSubjects } from './derive_coverage_subjects';
import type { EsReportContextClient } from './load_report_hunt_context';
import { loadReportHuntContext } from './load_report_hunt_context';
import { readCurrentRunState } from './read_current_run_state';
import type { RehydrateProcessSelectors } from './rehydrate_process_selectors';
import type { ResolveProposalSlot } from './resolve_proposal_slot';
import type {
  CoordinatorInputs,
  CoverageSubject,
  CoverageWriteResult,
  UnresolvedMintPayload,
} from './types';

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
 * this run's own proposals are minted. It is the baseline `expectedProposalCount` is built on (see
 * below), so the settlement barrier each gate checks accounts for proposals that already existed
 * before this run, not just the ones this run mints. Not a guard: whether a finding gets a
 * Proposal is decided per subject by {@link ResolveProposalSlot}, not by whether the Investigation
 * has any. See the implementation (`check_existing_proposals.ts`) for which statuses count as
 * "existing" and why.
 */
export type CountExistingProposals = (investigationConversationId: string) => Promise<number>;

/**
 * Whether the Investigation has a Proposal still open (`pending` or `executing`), i.e. one an
 * analyst or an in-flight action still depends on. Deliberately narrower than
 * {@link CountExistingProposals}: a settled Proposal is no reason to hold a clean-run dismissal.
 */
export type HasOpenProposal = (investigationConversationId: string) => Promise<boolean>;

type DismissHold = Extract<PackageReportOutput, { status: 'packaged' }>['dismissHold'];

export interface RunPackageReportDeps {
  listRespondActions: ListRespondActions;
  writeCoverageKis: WriteCoverageKis;
  resolveHostEnrollment: ResolveHostEnrollment;
  rehydrateProcessSelectors: RehydrateProcessSelectors;
  countExistingProposals: CountExistingProposals;
  /** Where each finding's Proposal goes: a free id, or the live Proposal to converge onto. */
  resolveProposalSlot: ResolveProposalSlot;
  /** Adds this Investigation to the live Proposal's comment when a finding converges onto it. */
  appendAlsoRaisedBy: AppendAlsoRaisedBy;
  /**
   * *Internal*-user ES client for the no-hit coverage `threat_summary` / severity preference
   * (`loadReportHuntContext`). Only read on the no-hit branch, which has no current-run SSE to
   * fall back to from this helper's own failure; a thin synthetic string stands in instead.
   * Optional so a caller without the threat-reports index wired up still packages. Must not be
   * the step's scoped client: the hunt worker's service-account role has no grant at all on
   * `.kibana-threat-reports`, so a scoped search there silently returns zero hits rather than
   * erroring (see `loadReportHuntContext`'s doc comment).
   */
  getEsReportContextClient?: () => EsReportContextClient;
  /** Logs a threat report load failure; absent, the failure is silent. */
  logger?: Logger;
  hasOpenProposal: HasOpenProposal;
}

/**
 * Decides whether a clean-run dismissal may proceed. `decidePackageReport` is pure and cannot do
 * this lookup, so it lives here. Fails closed: if the lookup throws, the Investigation stays open.
 *
 * Closes the steady-state case only, not the create window: the packaging workflow dispatches
 * each gate with `workflow.executeAsync` and releases its concurrency slot before any gate has
 * actually created its Proposal. A clean run that lands in that window sees no open Proposal and
 * still dismisses, stranding the decision the Proposal is about to carry. The per-subject ids
 * that keep two runs from creating one Proposal twice do not help here: this asks a different
 * question (is anything open on this Investigation), of a search that lags a write. Do not read
 * this guard as having closed the invariant.
 */
const resolveDismissHold = async (
  hasOpenProposal: HasOpenProposal,
  investigationConversationId: string
): Promise<DismissHold> => {
  try {
    return (await hasOpenProposal(investigationConversationId)) ? 'open_proposal' : 'none';
  } catch {
    return 'check_failed';
  }
};

/**
 * Turns what `decidePackageReport` wants to propose into what this run actually mints: each
 * finding either gets a free id to be created under, or converges onto a live Proposal that
 * already holds its subject, possibly one another Investigation raised.
 *
 * Throws if any lookup does, so the caller fails closed and mints nothing. A revision already
 * made to a live Proposal by then is harmless to repeat: the comment already names this
 * Investigation, and the next run skips it.
 */
const settleProposals = async ({
  wanted,
  investigationConversationId,
  spaceId,
  deps,
}: {
  wanted: UnresolvedMintPayload[];
  investigationConversationId: string;
  spaceId: string;
  deps: Pick<RunPackageReportDeps, 'resolveProposalSlot' | 'appendAlsoRaisedBy'>;
}): Promise<{
  proposals: PackageReportMintPayload[];
  converged: ConvergedProposal[];
  alreadyOpenCount: number;
}> => {
  const proposals: PackageReportMintPayload[] = [];
  const converged: ConvergedProposal[] = [];
  let alreadyOpenCount = 0;

  for (const proposal of wanted) {
    const slot = await deps.resolveProposalSlot({
      subjectKey: proposal.subjectKey,
      actionInput: proposal.actionInput,
    });
    if (slot.kind === 'mint') {
      proposals.push({ ...proposal, proposalId: slot.proposalId });
      continue;
    }

    const outcome = await deps.appendAlsoRaisedBy({
      live: slot.live,
      investigationConversationId,
    });
    // This Investigation's own Proposal, found again by a rerun: nothing to add to it and no
    // journal line to write, but the run still created nothing for this finding, which its
    // summary has to be able to say.
    if (outcome === 'same_investigation') {
      alreadyOpenCount += 1;
      continue;
    }
    converged.push({
      title: proposal.title ?? slot.live.title,
      proposalId: slot.live.proposalId,
      ownerConversationId: slot.live.conversationId,
      outcome,
      note: buildConvergenceNote({ spaceId, live: slot.live, outcome }) ?? '',
    });
  }

  return { proposals, converged, alreadyOpenCount };
};

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
 * Only what this run mints is added to the baseline. A finding that converges onto a live Proposal
 * mints nothing, and that Proposal belongs to its owner's conversation, so it counts on neither
 * side: not in this Investigation's all-time total, and not in what it expects. A Proposal this
 * Investigation already holds (a rerun finding the same subject) is in the baseline already.
 *
 * Exported and kept as a pure function, separate from the decision above, so the arithmetic can
 * be tested on its own. A rerun that mints a new Proposal beside an Investigation's older ones is
 * exactly the case it exists for. Do not simplify it back to `newProposalCount` because that
 * looks like the usual case -- that is the bug this baseline was fixing.
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
 * state cannot be read, when fewer current-run SSEs were found than the hunt prepared (a
 * partial `attach_sse` foreach), and when a hunt that did not complete left nothing to package.
 */
export const runPackageReport = async ({
  spaceId,
  reportId,
  investigationConversationId,
  runId,
  huntStatus,
  hasConfirmedHit,
  expectedSseCount,
  coordinator = {},
  attachments,
  deps,
}: {
  spaceId: string;
  reportId: string;
  investigationConversationId: string;
  runId: string;
  huntStatus: PackageReportInput['huntStatus'];
  hasConfirmedHit: boolean;
  /**
   * Number of SSE attachments the hunt child prepared for this run (`hunt.yaml`'s `sse_count`
   * output). Compared against what `readCurrentRunState` actually found: `attach_sse`'s
   * `foreach` swallows a per-item attach failure with `continue`, so a shortfall here is
   * otherwise invisible -- packaging would read the attachments that did land and proceed as
   * if the run were complete, silently dropping whichever finding failed to attach.
   *
   * Undefined skips the check below rather than failing closed: an already-installed Worker
   * that has not yet picked up the call site supplying this field (its `yamlTemplate` hash does
   * not cover the imported YAML it renders, so it only updates when its own `version` bumps)
   * must not have every packaging call start erroring just because this step's own schema
   * changed out from under it -- that would turn a staleness gap into an outage.
   */
  expectedSseCount: number | undefined;
  /**
   * The coordinator result the hunt child passed along. A clean run leaves no SSE, so this is
   * the only place its Tier 2 targets and executed queries exist; absent (an older Worker) it
   * degrades the coverage KI's `data_sources` / `validated_esql`, never fails packaging.
   */
  coordinator?: CoordinatorInputs;
  attachments: VersionedAttachment[] | undefined;
  deps: RunPackageReportDeps;
}): Promise<PackageReportOutput> => {
  const expectedId = buildHuntInvestigationConversationId({ spaceId, reportId });
  if (investigationConversationId !== expectedId) {
    throw new PackageReportIdentityError(
      `investigationConversationId does not match hunt:report:${spaceId}|${reportId} binding`
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
      // No SSE exists here, so the coordinator result the hunt child passed along is the only
      // source for the executed Tier 2 queries and the dataset hint. The report supplies the
      // threat story; a failed or missing load degrades to what the inputs alone can say
      // instead of failing packaging.
      const reportContext = deps.getEsReportContextClient
        ? await loadReportHuntContext({
            esClient: deps.getEsReportContextClient(),
            spaceId,
            reportId,
            logger: deps.logger,
          })
        : undefined;
      const dismissHold = await resolveDismissHold(
        deps.hasOpenProposal,
        investigationConversationId
      );
      const subjects = deriveCleanCoverageSubjects({
        spaceId,
        reportId,
        inputs: coordinator,
        reportContext,
        severity: reportContext?.severity,
        investigationSummary: buildCleanInvestigationSummary({
          inputs: coordinator,
          reportContext,
          dismissHold,
        }),
        investigationConversationId,
      });
      const coverage = await deps.writeCoverageKis(subjects);
      return {
        status: 'packaged',
        coverage,
        proposals: [],
        converged: [],
        alreadyOpenCount: 0,
        proposalBullets: [],
        omittedProposalCount: 0,
        dismiss: dismissHold === 'none',
        dismissHold,
        closureSummary:
          dismissHold === 'none'
            ? `Hunt for report ${reportId} found no confirmed hits. Closing: nothing in this environment matched the report at the confirming-index bar.`
            : `Hunt for report ${reportId} found no confirmed hits. Leaving the Investigation open: ${
                dismissHold === 'open_proposal'
                  ? 'it still has a pending or executing Proposal from an earlier run.'
                  : 'could not verify whether it has an open Proposal.'
              }`,
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

  // A partial `attach_sse` foreach (some items attached, some swallowed a failure via
  // `continue`) leaves a non-empty but short current-run state -- the gap the `!state`
  // branch above cannot see, since it only catches a total miss. Reported the same way as a
  // total miss: `run_incomplete`, not packaged off an incomplete finding set.
  if (expectedSseCount !== undefined && state.sseCount < expectedSseCount) {
    return {
      status: 'run_incomplete',
      reason: `Hunt prepared ${expectedSseCount} significant security event attachment(s) but only ${state.sseCount} were found for runId=${runId}; the remainder failed to attach`,
    };
  }

  const catalog = await deps.listRespondActions(spaceId);
  const decided = decidePackageReport({
    conversationId: investigationConversationId,
    state,
    catalog,
  });

  // Hit path: the threat story is the finding's own hypothesis. The report is loaded only as a
  // fallback, when a finding carries no hypothesis (the mapper's generic sentence counts as
  // none). Severity always comes from the SSE, so it does not depend on whether that load ran.
  const needsReport = state.findings.some((finding) => finding.hypothesis === undefined);
  const reportContext =
    needsReport && deps.getEsReportContextClient
      ? await loadReportHuntContext({
          esClient: deps.getEsReportContextClient(),
          spaceId,
          reportId,
          logger: deps.logger,
        })
      : undefined;
  const dismissHold: DismissHold = decided.dismiss
    ? await resolveDismissHold(deps.hasOpenProposal, investigationConversationId)
    : 'none';

  // Only a run that would otherwise mint something needs the lookup: a dismissal (no confirmed
  // hit) has no proposals to suppress, and `decidePackageReport` never returns `dismiss: false`
  // with an empty `proposals` (the analyst-recommendation fallback always fills it).
  let mintSuppression: MintSuppression = 'none';
  let existingProposalCount = 0;
  let proposals: PackageReportMintPayload[] = [];
  let converged: ConvergedProposal[] = [];
  let alreadyOpenCount = 0;
  if (!decided.dismiss) {
    try {
      existingProposalCount = await deps.countExistingProposals(investigationConversationId);
      ({ proposals, converged, alreadyOpenCount } = await settleProposals({
        wanted: decided.proposals,
        investigationConversationId,
        spaceId,
        deps,
      }));
    } catch {
      // Fails closed: the one case it must not mishandle is the one where it cannot tell what
      // already exists, because minting then could duplicate a Proposal an analyst is deciding on.
      // `proposals`, `converged` and `alreadyOpenCount` still hold their empty starting values:
      // they are only assigned from a `settleProposals` that returned.
      mintSuppression = 'check_failed';
    }
  }

  const subjects = deriveCoverageSubjects({
    spaceId,
    state: {
      ...state,
      severity: state.severity ?? reportContext?.severity,
      investigationSummary: buildInvestigationSummary({
        state,
        decided: { dismiss: decided.dismiss, proposals },
        mintSuppression,
        dismissHold,
        converged,
        alreadyOpen: alreadyOpenCount,
      }),
      coordinator,
      reportContext,
    },
    investigationConversationId,
  });
  const coverage = await deps.writeCoverageKis(subjects);

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

  const { bullets: proposalBullets, omittedCount: omittedProposalCount } =
    buildProposalSummaryBullets(proposals);

  return {
    status: 'packaged',
    coverage,
    proposals,
    converged,
    alreadyOpenCount,
    proposalBullets,
    omittedProposalCount,
    // Not forced to `true`: a confirmed hit is not benign, even when this run mints nothing for
    // it. Accepted consequence, not an oversight: every finding may have converged onto a live
    // Proposal (this Investigation's own, or another's), in which case no gate of this run exists
    // to close the Investigation, and it stays open until an analyst does so by hand. The journal
    // line written for each converged finding says where it went, which keeps the finding visible
    // rather than silently closed. Whether such an Investigation should close itself, with a
    // pointer to the Proposal, is a decision left for a follow-up.
    dismiss: decided.dismiss && dismissHold === 'none',
    dismissHold,
    closureSummary: decided.closureSummary,
    expectedProposalCount,
    mintSuppression,
  };
};
