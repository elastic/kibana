/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_RULES_PER_TRIGGER } from '../constants';
import {
  detectionRulesCreatedTriggerDef,
  DetectionRulesCreatedTriggerId,
} from './detection_rules_created';

const schema = detectionRulesCreatedTriggerDef.eventSchema;

const validPayload = {
  ids: ['so-1', 'so-2'],
  types: ['query', 'eql'],
  tags: ['Elastic'],
  totalCount: 2,
  source: 'api',
};

describe('detectionRulesCreated trigger', () => {
  it('has the correct id', () => {
    expect(detectionRulesCreatedTriggerDef.id).toBe(DetectionRulesCreatedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(detectionRulesCreatedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() => schema.parse(validPayload)).not.toThrow();
  });

  it('accepts a payload without source', () => {
    const { source, ...withoutSource } = validPayload;
    expect(() => schema.parse(withoutSource)).not.toThrow();
  });

  // A rejected event is dropped, so its rules would never reach subscribed workflows.
  it('accepts rule types it does not know yet', () => {
    expect(() => schema.parse({ ...validPayload, types: ['some_future_rule_type'] })).not.toThrow();
  });

  it('accepts exactly MAX_RULES_PER_TRIGGER ids and rejects one more', () => {
    const idsOf = (count: number) => Array.from({ length: count }, (_, i) => `id-${i}`);
    const payloadWith = (count: number) => ({
      ...validPayload,
      ids: idsOf(count),
      totalCount: count,
    });

    expect(() => schema.parse(payloadWith(MAX_RULES_PER_TRIGGER))).not.toThrow();
    expect(() => schema.parse(payloadWith(MAX_RULES_PER_TRIGGER + 1))).toThrow();
  });

  it('accepts every source the emitters use', () => {
    ['api', 'import', 'prebuilt_install', 'duplicate', 'siem_migration', 'restore'].forEach(
      (source) => expect(() => schema.parse({ ...validPayload, source })).not.toThrow()
    );
  });

  it('rejects an unknown source', () => {
    expect(() => schema.parse({ ...validPayload, source: 'not_a_source' })).toThrow();
  });

  it('rejects an empty ids list and missing required fields', () => {
    expect(() => schema.parse({ ...validPayload, ids: [] })).toThrow();
    expect(() => schema.parse({ ids: ['so-1'] })).toThrow();
  });
});
