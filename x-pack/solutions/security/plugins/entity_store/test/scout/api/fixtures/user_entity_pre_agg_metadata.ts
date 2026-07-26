/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import {
  applyWhenConditionTrueSetFields,
  getDocument,
} from '../../../../common/domain/euid/commons';
import {
  applyFieldEvaluations,
  getFieldEvaluationsFromDefinition,
  getIdentityFieldEvaluationsFromDefinition,
} from '../../../../common/domain/euid/field_evaluations';
import { getEntityDefinitionWithoutId } from '../../../../common/domain/definitions/registry';

const USER_ENTITY_TYPE = 'user' as const;

/**
 * Mirrors the full user entity pre-agg pipeline in-memory:
 * 1. Shared field evaluations (entity.source)
 * 2. Identity-specific field evaluations (entity.namespace)
 * 3. whenConditionTrueSetFieldsPreAgg / AfterStats (entity.name, entity.confidence)
 *
 * Used by DSL / Painless Scout tests to assert entity.namespace / entity.confidence /
 * entity.name align with the ES|QL extraction definitions.
 */
export function deriveUserEntityPreAggMetadata(hit: { _source?: unknown }): {
  namespace?: string;
  confidence?: string;
  entityName?: string;
} {
  const doc = cloneDeep(getDocument(hit));
  const def = getEntityDefinitionWithoutId(USER_ENTITY_TYPE);
  const sharedEvaluations = getFieldEvaluationsFromDefinition(def);
  if (sharedEvaluations.length > 0) {
    Object.assign(doc, applyFieldEvaluations(doc, sharedEvaluations));
  }
  const identityEvaluations = getIdentityFieldEvaluationsFromDefinition(def);
  if (identityEvaluations.length > 0) {
    Object.assign(doc, applyFieldEvaluations(doc, identityEvaluations));
  }
  if (def.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(doc, def.whenConditionTrueSetFieldsPreAgg);
  }
  if (def.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(doc, def.whenConditionTrueSetFieldsAfterStats);
  }
  return {
    namespace: doc['entity.namespace'] as string | undefined,
    confidence: doc['entity.confidence'] as string | undefined,
    entityName: doc['entity.name'] as string | undefined,
  };
}
