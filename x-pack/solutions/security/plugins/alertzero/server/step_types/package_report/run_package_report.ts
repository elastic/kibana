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
} from '../../../common/step_types/package_report';
import { buildHuntInvestigationConversationId } from '../../services/watches/hunt/common/hunt_investigation_id';
import { decidePackageReport } from './decide_package_report';
import { deriveCoverageSubjects } from './derive_coverage_subjects';
import {
  readCurrentRunState,
  type RehydrateProcessSelectors,
  type ResolveHostEnrollment,
} from './read_current_run_state';
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
 * Closure prose for a run with no findings. Absence of a hit is only a clean verdict when the
 * run actually covered what it was asked to, so the three hunt statuses must not collapse into
 * one sentence: an analyst reading a closed Investigation has to be able to tell "we looked and
 * the environment is clean" from "we could not look".
 */
const noFindingsClosureSummary = (
  huntStatus: PackageReportInput['huntStatus'],
  reportId: string
): string => {
  if (huntStatus === 'success') {
    return `Hunt for report ${reportId} found no confirmed hits. Closing: nothing in this environment matched the report at the confirming-index bar.`;
  }
  if (huntStatus === 'partial') {
    // Deliberately silent on whether the report stays eligible: `partial` covers both a
    // transient gap that a later sweep retries and a deterministic one that retires the
    // report, and this summary cannot tell them apart.
    return `Hunt for report ${reportId} found no confirmed hits, but did not cover everything it was asked to, so this is not a clean verdict.`;
  }
  return `Hunt for report ${reportId} did not run, so nothing was searched and no finding can be reported.`;
};

/**
 * Orchestrates packaging for one Investigation run. Throws
 * {@link PackageReportIdentityError} when the conversation id does not match the report
 * binding; returns typed `run_incomplete` only when the run claimed a hit whose current-run
 * SSE state cannot be read.
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
    if (!hasConfirmedHit) {
      return {
        status: 'packaged',
        coverage: { written: [], skipped: [] },
        proposals: [],
        dismiss: true,
        closureSummary: noFindingsClosureSummary(huntStatus, reportId),
        expectedProposalCount: 0,
      };
    }
    return {
      status: 'run_incomplete',
      reason: `No current-run SSE attachment for runId=${runId}`,
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
  // barrier each gate checks before closing the Investigation. Never persisted to
  // conversation metadata: the platform `investigation` template's schema has no room for
  // it, and nothing ever read the metadata copy back (dead write, removed).
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
