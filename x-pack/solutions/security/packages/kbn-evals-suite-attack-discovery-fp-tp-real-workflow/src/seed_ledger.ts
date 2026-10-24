/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Everything one eval run seeds into the shared cluster, recorded BEFORE the write that
 * can fail so teardown also covers a case whose seeding died half way. Teardown removes
 * exactly these ids, never a broad pattern, so foreign data living in the same indices
 * survives.
 */
export class SeedLedger {
  /** Persisted attack discovery ids (`_id` in the scheduled and ad-hoc AD indices). */
  readonly attackDiscoveryIds = new Set<string>();
  /** Cited alert ids seeded into the security alerts index. */
  readonly alertIds = new Set<string>();
  /** Investigation conversation ids opened through the Agent Builder API. */
  readonly conversationIds = new Set<string>();
  /** Attack discovery ids stamped on seeded raw events (`labels.fp_tp_fixture`). */
  readonly eventOwnerIds = new Set<string>();
  /** Derived entity doc ids written to the entities index. */
  readonly entityIds = new Set<string>();
  /** True once this run PUT the raw-events data-stream template. */
  rawEventsTemplateInstalled = false;
}
