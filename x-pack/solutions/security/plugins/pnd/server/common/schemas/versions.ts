/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Spike-owned proposal document schema version. Bump on breaking field changes. */
export const DAYBREAK_PROPOSAL_SCHEMA_VERSION = '1.0.0-spike';

/** Spike-owned evidence package schema version. */
export const DAYBREAK_EVIDENCE_SCHEMA_VERSION = '1.0.0-spike';

/** Spike-owned WorkerEvaluationRecord schema version. */
export const DAYBREAK_WORKER_EVAL_SCHEMA_VERSION = '1.0.0-spike';

/** Ownership model for these schemas (adopt/diff at #17942). */
export const SCHEMA_OWNERSHIP = 'spike-canonical' as const;

/** Default worker id for the PND Watch chain (CWL WorkerRef alignment). */
export const DEFAULT_PND_WORKER_ID = 'pnd-watch-worker';

// UNRATIFIED: minimum worker confidence a proposal must carry before the
// fail-closed approval gate will let it transition to `approved`. This is the
// single source of truth shared by the server-side gate (gate.ts) and the eval
// harness so the runtime enforcement and the scored expectation cannot drift.
//
// Value + decision date mirror the FPR capability-evaluation profile's
// "Proposed threshold: 0.80, unratified, decision date 2026-07-13". It stays
// UNRATIFIED until detection engineering + product/security owners sign off on
// the first dataset results; when they do, only this constant changes.
export const DAYBREAK_APPROVAL_CONFIDENCE_THRESHOLD = 0.8;

/** Decision date attached to the unratified confidence threshold (provenance). */
export const DAYBREAK_APPROVAL_CONFIDENCE_THRESHOLD_DECISION_DATE = '2026-07-13';
