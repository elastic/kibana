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
  it('combines all three entity type EUIDs with nested MV_APPEND', () => {
    const pipeline = buildAlertEuidPipeline(mockEuid);
    expect(pipeline).toContain(
      '| EVAL derived_euids = MV_APPEND(user_euid, MV_APPEND(host_euid, service_euid))'
    );
  });

  it('uses COALESCE to prefer the stamped kibana.alert.entity.id over derived_euids', () => {
    const pipeline = buildAlertEuidPipeline(mockEuid);
    expect(pipeline).toContain(
      '| EVAL entity_ids = COALESCE(`kibana.alert.entity.id`, derived_euids)'
    );
  });

  it('expands entity_ids, assigns to entity.id, and filters nulls', () => {
    const pipeline = buildAlertEuidPipeline(mockEuid);
    expect(pipeline).toContain('| MV_EXPAND entity_ids');
    expect(pipeline).toContain('| EVAL entity.id = entity_ids');
    expect(pipeline).toContain('| WHERE entity.id IS NOT NULL');
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
    // 3 euid EVALs + 1 derived_euids + 1 entity_ids + 1 entity.id = 6
    expect(evalLines).toHaveLength(6);
  });
});
