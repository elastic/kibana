/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LookupDocument {
  entity_id: string;
  resolution_target_id: string | null;
  propagation_target_id: string[] | null;
  relationship_type: string;
  calculation_run_id: string;
  '@timestamp': string;
}

export const RESOLUTION_RELATIONSHIP_TYPE = 'entity.relationships.resolution.resolved_to';
export const SELF_RELATIONSHIP_TYPE = 'self';

/**
 * Subset of entity-store `_source` fields that Phase 0 needs to build lookup
 * rows. `entity.id` and `resolved_to` are kept as `string | undefined` rather
 * than `unknown` because Phase 0 only consumes them after explicit type guards;
 * unlike modifier enrichment, no looser shape is observed in practice.
 */
export interface EntityStoreLookupSource {
  entity?: {
    id?: string;
    relationships?: {
      resolution?: {
        resolved_to?: string;
      };
    };
  };
}
