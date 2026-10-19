/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertEuidPipeline } from './alert_euid_pipeline';

const pipelineText = (): string => buildAlertEuidPipeline().join('\n');

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
    expect(stamped).not.toContain('user_euid =');
    expect(derived).toContain('user_euid =');
    expect(derived).toContain('host_euid =');
    expect(derived).toContain('service_euid =');
    expect(derived).toContain('_ea_entity_id = MV_DEDUPE(MV_APPEND(MV_APPEND(');
  });

  it('expands _ea_entity_id, filters nulls, deduplicates, then renames to entity.id for the JOIN', () => {
    const pipeline = buildAlertEuidPipeline();
    expect(pipeline).toContain('| MV_EXPAND _ea_entity_id');
    expect(pipeline).toContain('| WHERE _ea_entity_id IS NOT NULL');
    expect(pipeline).toContain('| STATS has_severe_alert = MAX(is_severe_alert) BY _ea_entity_id');
    expect(pipeline).toContain('| RENAME _ea_entity_id AS `entity.id`');
  });

  it('evaluates the fields the EUIDs read before the EUIDs', () => {
    const derived = pipelineText().split('WHERE `kibana.alert.entity.id` IS NULL')[1];
    expect(derived.indexOf('_src_entity_source0 =')).toBeGreaterThan(-1);
    expect(derived.indexOf('_src_entity_source0 =')).toBeLessThan(derived.indexOf('user_euid ='));
  });
});
