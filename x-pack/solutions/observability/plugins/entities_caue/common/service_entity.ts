/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Row shape produced by SERVICE_ENTITIES_QUERY against the entity store latest index.
 * Mirrors the fields kept in common/constants.ts.
 */
export interface ServiceEntity {
  'entity.id': string;
  'entity.name': string;
  'service.environment': string | string[] | null;
  'service.version': string | null;
  'service.type': string | null;
  'entity.lifecycle.first_seen': string | null;
  'entity.lifecycle.last_seen': string | null;
  'entity.source': string | string[] | null;
  /** Written by serviceHealthMaintainer. Capitalised level name e.g. "Degraded". */
  'service.health.calculated_level': string | null;
  /** Normalised health score 0–100. Higher is healthier. */
  'service.health.calculated_score_norm': number | null;
}
