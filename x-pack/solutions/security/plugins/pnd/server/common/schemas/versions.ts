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
