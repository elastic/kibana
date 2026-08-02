/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// D11 — Attack Discovery continuation Worker.
//
// Consumes a REAL, persisted AD 2.0 discovery (the `AttackDiscovery` shape
// owned by @kbn/elastic-assistant-common) and projects it into a canonical
// `watch-ad` Proposal for the Watch Floor review queue. This adapter imports
// the platform's real discovery type — it does NOT invent an AD output shape.
// Every field on the emitted Proposal is either (a) copied verbatim from the
// discovery, or (b) a deterministic, provenance-bearing transform of a real
// discovery field. Nothing is fabricated.
//
// Confidence: AD 2.0 discoveries do NOT carry a numeric confidence score, so
// this adapter deliberately does not synthesise one. The proposal is emitted
// with confidence 0, which — via the shared readiness gate
// (DAYBREAK_APPROVAL_CONFIDENCE_THRESHOLD) — guarantees an AD-derived proposal
// can never auto-approve. It must pass through explicit human review. This is
// the honest, fail-closed behaviour: absence of a confidence signal is treated
// as "insufficient", not "assume high".

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Proposal } from './proposal';
import { DAYBREAK_PROPOSAL_SCHEMA_VERSION } from './versions';

export interface AttackDiscoveryContinuationInput {
  /** The real, persisted AD 2.0 discovery to continue from. */
  discovery: AttackDiscovery;
  /** Investigation this continuation is attached to. */
  investigationId: string;
  /** Stable proposal id (caller-provided so it is deterministic/testable). */
  proposalId: string;
  /** ISO timestamp for createdAt (caller-provided for determinism). */
  createdAt: string;
}

/**
 * True when the discovery lacks the minimum substance to be actionable — no
 * alert basis AND no summary. Fail-closed: such a discovery must not silently
 * become a proposal.
 */
export const isDiscoveryUnactionable = (discovery: AttackDiscovery): boolean => {
  const hasAlertBasis = Array.isArray(discovery.alertIds) && discovery.alertIds.length > 0;
  const hasSummary =
    typeof discovery.summaryMarkdown === 'string' && discovery.summaryMarkdown.trim().length > 0;
  return !hasAlertBasis && !hasSummary;
};

/**
 * Build a `watch-ad` proposal from a real AD 2.0 discovery.
 *
 * @throws Error when the discovery is unactionable (no alert basis and no
 *   summary) — fail-closed, so a hollow discovery never reaches the queue.
 */
export const buildProposalFromAttackDiscovery = (
  input: AttackDiscoveryContinuationInput
): Proposal => {
  const { discovery, investigationId, proposalId, createdAt } = input;

  if (isDiscoveryUnactionable(discovery)) {
    throw new Error(
      'attack-discovery-continuation: discovery is unactionable (no alertIds and no summaryMarkdown)'
    );
  }

  // evidenceRefs: the real alert ids the discovery is grounded in. This is the
  // provenance chain back to source data — never synthesised.
  const evidenceRefs = Array.isArray(discovery.alertIds) ? [...discovery.alertIds] : [];

  // recommendation: the discovery's own summary is the actionable recommendation
  // to the analyst. Prefixed to make the required action explicit.
  const summary = (discovery.summaryMarkdown ?? '').trim();
  const recommendation =
    summary.length > 0
      ? `Assess attack — ${summary}`
      : `Assess attack — review ${evidenceRefs.length} correlated alert(s)`;

  // reasoning: the discovery's detailed markdown carries the model's grounded
  // reasoning. Copied verbatim (may be empty on a terse discovery).
  const reasoning = (discovery.detailsMarkdown ?? '').trim();

  const title = (discovery.title ?? '').trim() || `Attack Discovery ${discovery.id ?? proposalId}`;

  return {
    id: proposalId,
    schemaVersion: DAYBREAK_PROPOSAL_SCHEMA_VERSION,
    sourceWatch: 'watch-ad',
    investigationId,
    title,
    status: 'new',
    // AD 2.0 emits no numeric confidence; fail-closed to 0 so the readiness
    // gate forces explicit human review (see file header).
    confidence: 0,
    recommendation,
    reasoning,
    evidenceRefs,
    approvals: [],
    requiredApproverCount: 1,
    draft: false,
    approvalRequired: true,
    createdAt,
  };
};
