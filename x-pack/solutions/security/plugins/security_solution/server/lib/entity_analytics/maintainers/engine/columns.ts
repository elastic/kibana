/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRelationshipKey } from '@kbn/entity-store/common/domain/definitions/common_fields';

/**
 * The single source of truth for the column-name contract between the ES|QL
 * builder (Step 2) and the row parser. Both `build_targets_per_actor_query`
 * and `parse_targets_per_actor_rows` import these helpers so a future
 * refactor that renames a STATS column updates exactly one place.
 *
 * Override configs are required to honour these names too — see the column
 * contract on `OverrideRelationshipIntegrationConfig`.
 */
export const ENGINE_COLUMNS = {
  /** The actor EUID column (e.g. `"user:alice@okta"`), present on every row. */
  actor: 'actorUserId',

  /**
   * Column name for the flat targets list emitted by `kind: 'standard'` and
   * `kind: 'override'` configs. Matches the schema key the parser writes to
   * under `entity.relationships`.
   */
  flat: (relationshipKey: EntityRelationshipKey): EntityRelationshipKey => relationshipKey,

  /**
   * Column name for the above-threshold bucket emitted by `kind: 'bucketed'`
   * configs. Matches the schema key the parser writes to.
   */
  bucketAbove: (above: EntityRelationshipKey): EntityRelationshipKey => above,

  /**
   * Column name for the below-threshold bucket emitted by `kind: 'bucketed'`
   * configs. Matches the schema key the parser writes to.
   */
  bucketBelow: (below: EntityRelationshipKey): EntityRelationshipKey => below,
} as const;
