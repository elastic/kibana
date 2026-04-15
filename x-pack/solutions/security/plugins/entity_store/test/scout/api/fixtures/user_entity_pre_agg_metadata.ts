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
} from '../../../../common/domain/euid/field_evaluations';
import { getEntityDefinitionWithoutId } from '../../../../common/domain/definitions/registry';

const USER_ENTITY_TYPE = 'user' as const;

/**
 * Mirrors user entity field evaluations (including condition whenClauses for entity.namespace) +
 * whenConditionTrueSetFieldsAfterStats (entity.name + entity.confidence; in-memory)
 * so DSL / Painless Scout tests can assert entity.namespace / entity.confidence / entity.name align with definitions.
 */
export function deriveUserEntityPreAggMetadata(hit: { _source?: unknown }): {
  namespace?: string;
  confidence?: string;
  entityName?: string;
} {
  const doc = cloneDeep(getDocument(hit));
  const def = getEntityDefinitionWithoutId(USER_ENTITY_TYPE);
  const fieldEvaluations = getFieldEvaluationsFromDefinition(def);
  if (fieldEvaluations.length > 0) {
    const evaluated = applyFieldEvaluations(doc, fieldEvaluations);
    Object.assign(doc, evaluated);
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
