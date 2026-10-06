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

const pipelineText = (euid: EntityStoreEuid = mockEuid): string =>
  buildAlertEuidPipeline(euid).join('\n');

describe('buildAlertEuidPipeline', () => {
  it('FORKs stamped alerts away from EUID derivation', () => {
    const query = pipelineText();
    expect(query).toContain('| FORK (');
    expect(query).toContain('WHERE `kibana.alert.entity.id` IS NOT NULL');
    expect(query).toContain('| EVAL _ea_entity_id = `kibana.alert.entity.id`');
    expect(query).toContain('WHERE `kibana.alert.entity.id` IS NULL');
    expect(query).not.toContain('COALESCE(`kibana.alert.entity.id`');
  });

  it('derives typed EUIDs only on the unstamped FORK branch', () => {
    const query = pipelineText();
    const stampedEnd = query.indexOf('WHERE `kibana.alert.entity.id` IS NULL');
    expect(stampedEnd).toBeGreaterThan(-1);
    const stamped = query.slice(0, stampedEnd);
    const derived = query.slice(stampedEnd);
    expect(stamped).not.toContain('user_euid = "mock_euid"');
    expect(derived).toContain('user_euid = "mock_euid"');
    expect(derived).toContain('host_euid = "mock_euid"');
    expect(derived).toContain('service_euid = "mock_euid"');
    expect(derived).toContain('MV_APPEND(MV_APPEND(user_euid, host_euid), service_euid)');
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

    expect(pipelineText(euidWithFieldEvals)).toContain('| EVAL user.namespace = user.domain');
  });

  it('does not include a field evaluation EVAL when getFieldEvaluations returns undefined', () => {
    expect(pipelineText()).not.toContain('user.namespace');
  });
});
