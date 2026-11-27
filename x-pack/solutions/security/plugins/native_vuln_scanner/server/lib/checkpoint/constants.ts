/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One document per OS release: the feed and inventory fingerprints of the last run that matched
 * that release and wrote its findings. A refresh reads it to decide which releases to rematch;
 * like the run summary it must sit under `.kibana*` because that is where the reserved
 * `kibana_system` role may create indices.
 */
export const CHECKPOINT_INDEX = '.kibana-native-vuln-scanner-checkpoints';

export type CheckpointRunScope = 'full' | 'refresh';

/** The run scope shared by the scan summary and the checkpoints (`ScanSummary.scope`). */
export type ScanRunScope = CheckpointRunScope;

/** The fingerprint of one release's last matched state, as the checkpoint stores it. */
export interface CheckpointDoc {
  /** `family:version`, e.g. `rhel:9`; also the document id. */
  release: string;
  /** Validators of the last matched feed: the etag the vendor sent and the sha256 of the body bytes. */
  feed: { etag?: string; sha256: string };
  /** sha256 over the stable serialization of the release's per-host inventory the run matched. */
  inventory_sha256: string;
  /** When this checkpoint was written. */
  matched_at: string;
  /** The run (workflow execution) id and whether it was a full scan or a refresh. */
  run_id: string;
  run_scope: CheckpointRunScope;
}
