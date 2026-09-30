/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { PackageReportOutput } from '../../../common/step_types/package_report';
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
 * Orchestrates packaging for one Investigation run. Throws
 * {@link PackageReportIdentityError} when the conversation id does not match
 * the report binding; returns typed `run_incomplete` when current-run SSE is missing.
 */
export const runPackageReport = async ({
  spaceId,
  reportId,
  investigationConversationId,
  runId,
  huntStatus,
  huntConfirmedHit,
  attachments,
  deps,
}: {
  spaceId: string;
  reportId: string;
  investigationConversationId: string;
  runId: string;
  /** The hunt child's own `status` output for this run; disambiguates a clean run from an incomplete one. */
  huntStatus?: string;
  /** The hunt child's own `hit` output for this run. */
  huntConfirmedHit?: boolean;
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
    huntStatus,
    huntConfirmedHit,
    resolveHostEnrollment: deps.resolveHostEnrollment,
    rehydrateProcessSelectors: deps.rehydrateProcessSelectors,
  });

  if (!state) {
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
