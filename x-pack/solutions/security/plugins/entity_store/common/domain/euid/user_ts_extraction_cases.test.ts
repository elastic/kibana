/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { USER_TS_EXTRACTION_CASES } from '../../../test/scout/api/fixtures/user_ts_extraction_cases';
import { getEuidFromObject } from './memory';
import { applyWhenConditionTrueSetFields, getDocument } from './commons';
import { applyFieldEvaluations, getFieldEvaluationsFromDefinition } from './field_evaluations';
import { getEntityDefinitionWithoutId } from '../definitions/registry';

const USER = 'user' as const;

function deriveUserMeta(doc: Record<string, unknown>) {
  const d = cloneDeep(getDocument({ _source: doc }));
  const def = getEntityDefinitionWithoutId(USER);
  const fieldEvaluations = getFieldEvaluationsFromDefinition(def);
  if (fieldEvaluations.length > 0) {
    Object.assign(d, applyFieldEvaluations(d, fieldEvaluations));
  }
  if (def.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(d, def.whenConditionTrueSetFieldsPreAgg);
  }
  if (def.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(d, def.whenConditionTrueSetFieldsAfterStats);
  }
  return {
    namespace: d['entity.namespace'] as string | undefined,
    confidence: d['entity.confidence'] as string | undefined,
    entityName: d['entity.name'] as string | undefined,
  };
}

describe('USER_TS_EXTRACTION_CASES vs getEuidFromObject (user.ts)', () => {
  it.each(USER_TS_EXTRACTION_CASES.map((c) => [c.id, c] as const))('%s', (_id, scenario) => {
    const doc = scenario.ingestSource ?? scenario.dslFilterSource;
    const euid = getEuidFromObject(USER, doc);
    expect(euid).toBe(scenario.expectedEuid);

    if (scenario.expectedEuid === undefined) {
      return;
    }
    if (scenario.expectedMeta) {
      expect(deriveUserMeta(doc)).toStrictEqual({
        namespace: scenario.expectedMeta.namespace,
        confidence: scenario.expectedMeta.confidence,
        entityName: scenario.expectedMeta.entityName,
      });
    }
  });
});
