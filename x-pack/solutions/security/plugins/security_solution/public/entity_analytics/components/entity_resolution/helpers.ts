/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compatibility shim — the entity-resolution helpers were split into
 * {@link ./entity_fields} (generic entity field IO + table presentation) and
 * {@link ./resolution_provenance} (parallel-resolution verdict / provenance
 * readers). Existing call sites import from `./helpers` and stay green.
 */

export {
  getEntityField,
  getEntityId,
  getEntityLastSeen,
  getEntityName,
  getEntityRiskScore,
  getEntitySource,
  getResolutionRiskScore,
  truncatedCellCss,
} from './entity_fields';
export type { TableEntityRow } from './entity_fields';

export {
  getByEmbeddingVerdict,
  getByManualVerdict,
  getByRuleVerdict,
  getEffectiveTo,
  getResolutionModelId,
  getResolutionScore,
  getResolvedBy,
  isDivergent,
} from './resolution_provenance';
export type {
  PerSourceResolutionVerdict,
  ResolutionProvenanceSource,
} from './resolution_provenance';
