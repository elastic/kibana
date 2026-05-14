/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';

/**
 * Per-run summary of the KI relationship maintainer. Persisted on the task
 * state so operators can inspect what the previous run did via the entity
 * maintainer status API without having to chase logs.
 *
 * The shape mirrors what the existing `automated_resolution` maintainer
 * persists (`lastRun: { ... } | null`) so consumers do not need to special-
 * case different maintainers when rendering status.
 */
// Declared as a type alias (not an interface) so it satisfies the
// recursive `JsonValue` constraint on `EntityMaintainerState`. Interfaces
// are not assignable to that constraint because they lack the implicit
// index signature TS requires for recursive structural compatibility.
export interface KiRelationshipsLastRun {
  /** Number of dependency features observed (post-min-confidence). */
  dependenciesProcessed: number;
  /**
   * Number of dependency features whose source entity could not be
   * resolved within the dep's stream lineage. This is the canonical signal
   * that the LLM emitted dependencies before the corresponding entities
   * materialized; on the next run, after entity extraction catches up, the
   * count should drop toward zero.
   */
  sourceUnresolved: number;
  /** Same as above, but for the target side. */
  targetUnresolved: number;
  /**
   * Number of bulk-update operations issued (one per source entity that
   * had at least one resolved relationship). Each operation can carry
   * multiple relationship types; a single source entity is updated at
   * most once per run.
   */
  sourcesUpdated: number;
  /**
   * Total number of relationship edges written across all updates. Always
   * `>= sourcesUpdated`. Provides the per-run "how busy is the graph"
   * signal independent of whether multiple deps share a source.
   */
  edgesWritten: number;
}

// Likewise a type alias (not an interface) so the recursive `JsonValue`
// constraint inherited from `EntityMaintainerState` still admits this shape.
export type KiRelationshipsState = EntityMaintainerState & {
  lastRun: KiRelationshipsLastRun | null;
  lastRunTimestamp: string | null;
};

export const INITIAL_STATE: KiRelationshipsState = {
  lastRun: null,
  lastRunTimestamp: null,
};
