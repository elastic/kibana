/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';

const mockEuid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (_type: string, varName: string) => `${varName} = "mock_euid"`,
  },
} as unknown as EntityStoreEuid;

describe('buildAlertEuidPipeline', () => {
  it('picks the first non-null EUID via COALESCE over the stamped field and all three derived EUIDs', () => {
    const pipeline = buildAlertEuidPipeline(mockEuid);
    expect(pipeline).toContain(
      '| EVAL _ea_entity_id = COALESCE(`kibana.alert.entity.id`, user_euid, host_euid, service_euid)'
    );
  });

  it('expands _ea_entity_id, filters nulls, deduplicates, then renames to entity.id for the JOIN', () => {
    const pipeline = buildAlertEuidPipeline(mockEuid);
    expect(pipeline).toContain('| MV_EXPAND _ea_entity_id');
    expect(pipeline).toContain('| WHERE _ea_entity_id IS NOT NULL');
    expect(pipeline).toContain('| STATS BY _ea_entity_id');
    expect(pipeline).toContain('| RENAME _ea_entity_id AS `entity.id`');
  });

  it('includes optional field evaluation EVALs when the euid provides them', () => {
    const euidWithFieldEvals = {
      esql: {
        getFieldEvaluations: (type: string) =>
          type === 'user' ? 'user.namespace = user.domain' : undefined,
        getEuidEvaluation: (_type: string, varName: string) => `${varName} = "mock_euid"`,
      },
    } as unknown as EntityStoreEuid;

    const pipeline = buildAlertEuidPipeline(euidWithFieldEvals);
    expect(pipeline).toContain('| EVAL user.namespace = user.domain');
  });

  it('does not include a field evaluation EVAL when getFieldEvaluations returns undefined', () => {
    const pipeline = buildAlertEuidPipeline(mockEuid);
    // Each entity type produces exactly one EVAL (the euid assignment), not two
    const evalLines = pipeline.filter((l) => l.startsWith('| EVAL'));
    // 3 euid EVALs + 1 _ea_entity_id = 4
    expect(evalLines).toHaveLength(4);
  });
});
