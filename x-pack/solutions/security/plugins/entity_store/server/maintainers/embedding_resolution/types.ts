/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';
import type { IdentityFields } from './embed';

export interface EmbeddingResolutionState extends EntityMaintainerState {
  /** Max `entity.lifecycle.first_seen` processed so far. Null = full scan next run. */
  lastProcessedTimestamp: string | null;
  /**
   * Snapshot of {@link CURRENT_EMBED_SOURCE_VERSION} at the time the watermark
   * was last advanced. If the in-code constant has since changed, the run loop
   * resets the watermark to null so every entity is reconsidered with the new
   * identity-string recipe.
   */
  embedSourceVersion: string;
  /**
   * Per-run outcome counters. Phase 2 wrote only `embedded` / `failed`; Phase 3
   * adds the link-step counters but they are optional so existing state docs
   * keep deserialising. A field that's not applicable in the current run mode
   * (e.g. `linked` when `linkingEnabled === false`) is set to 0, never undefined.
   */
  lastRun: {
    embedded: number;
    failed: number;
    /** Phase 3 — entities whose top kNN candidate was linked. */
    linked?: number;
    /** Phase 3 — entities whose top-2 kNN candidates were tied at the top score. */
    skippedAmbiguous?: number;
    /** Phase 3 — entities whose top kNN candidate was below `threshold`. */
    skippedBelowThreshold?: number;
    /** Phase 3 — entities (source or candidate) flagged by the role-account guard. */
    skippedRoleAccount?: number;
  } | null;
}

export interface EntityToEmbed {
  /** `_id` of the doc in entities-latest-<ns> (sha256 of entity.id). */
  docId: string;
  entityId: string;
  firstSeen: string;
  identityString: string;
  /**
   * The raw identity fields that produced `identityString`, kept around so the
   * Phase 3 link step can run the role-account guard without re-reading the
   * source doc. (`identityString` is lossy — it's already lowercased + joined.)
   */
  identity: IdentityFields;
}
