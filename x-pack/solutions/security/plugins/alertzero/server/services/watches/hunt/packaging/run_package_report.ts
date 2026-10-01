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

export interface RunPackageReportDeps {
  listRespondActions: ListRespondActions;
  writeCoverageKis: WriteCoverageKis;
  resolveHostEnrollment: ResolveHostEnrollment;
  rehydrateProcessSelectors: RehydrateProcessSelectors;
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

  // Threaded through to the packaging workflow's per-Proposal gate fan-out as a plain
  // workflow input (`hunt_package_report.yaml`'s `dispatch_gate` step) — the settlement
  // barrier each gate checks before closing the Investigation. Not persisted to
  // conversation metadata: the platform `investigation` template's schema has no room
  // for it.
  const expectedProposalCount = decided.proposals.length;

  return {
    status: 'packaged',
    coverage,
    proposals: decided.proposals,
    dismiss: decided.dismiss,
    closureSummary: decided.closureSummary,
    expectedProposalCount,
  };
};
