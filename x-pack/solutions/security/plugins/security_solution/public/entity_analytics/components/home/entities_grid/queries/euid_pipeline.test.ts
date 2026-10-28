/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertEuidPipeline, buildEuidStages, evalGuardedTypedEuids } from './euid_pipeline';

describe('evalGuardedTypedEuids', () => {
  it('writes an MV_DEDUPE+MV_APPEND EVAL of null-safe COALESCEs into the given column', () => {
    const evalClause = evalGuardedTypedEuids('derived_euids');
    expect(evalClause).toContain('| EVAL derived_euids = MV_DEDUPE(MV_APPEND(MV_APPEND(');
    expect(evalClause).toContain('COALESCE(user_euid, host_euid, service_euid)');
    expect(evalClause).toContain('COALESCE(host_euid, service_euid, user_euid)');
    expect(evalClause).toContain('COALESCE(service_euid, user_euid, host_euid)');
  });

  it('does not use CASE, which ES|QL evaluates one row at a time', () => {
    expect(evalGuardedTypedEuids('derived_euids')).not.toContain('CASE(');
  });
});

describe('buildEuidStages', () => {
  it('expands a document into a row per entity it names, rather than keeping only the first id', () => {
    const stages = buildEuidStages().join('\n');
    expect(stages).toContain('| MV_EXPAND derived_euids');
    expect(stages).toContain('| RENAME derived_euids AS `entity.id`');
    expect(stages).not.toContain('EVAL `entity.id`');
  });
});

describe('buildAlertEuidPipeline', () => {
  it('matches each stamped id, which also keeps alerts stamped with several ids', () => {
    const pipeline = buildAlertEuidPipeline({ entityIds: ['host:h1', 'user:a'] }).join('\n');
    expect(pipeline).toContain(
      '| WHERE MV_CONTAINS(`kibana.alert.entity.id`, "host:h1") OR MV_CONTAINS(`kibana.alert.entity.id`, "user:a")'
    );
    expect(pipeline).not.toContain('`kibana.alert.entity.id` IN');
  });
});
