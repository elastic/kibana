/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getBurnRateEmbeddableSchema } from './burn_rate_schema';

describe('burn rate schema validation', () => {
  const burnRateSchema = getBurnRateEmbeddableSchema(mockGetDrilldownsSchema);

  it('should validate a valid burn rate state with all fields', () => {
    const validState = {
      slo_id: 'test-slo-id',
      slo_instance_id: 'test-instance-id',
      duration: '1h',
      title: 'Burn Rate Panel',
      hide_title: false,
    };

    expect(() => burnRateSchema.validate(validState)).not.toThrow();
    const result = burnRateSchema.validate(validState);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      slo_instance_id: 'test-instance-id',
      duration: '1h',
      title: 'Burn Rate Panel',
      hide_title: false,
    });
  });

  it('should validate with minimal required fields and apply slo_instance_id default', () => {
    const minimalState = {
      slo_id: 'test-slo-id',
      duration: '6h',
    };

    expect(() => burnRateSchema.validate(minimalState)).not.toThrow();
    const result = burnRateSchema.validate(minimalState);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      slo_instance_id: '*',
      duration: '6h',
    });
  });

  it('should validate with slo_id, slo_instance_id and duration only', () => {
    const state = {
      slo_id: 'test-slo-id',
      slo_instance_id: 'instance-abc',
      duration: '30m',
    };

    expect(() => burnRateSchema.validate(state)).not.toThrow();
    const result = burnRateSchema.validate(state);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      slo_instance_id: 'instance-abc',
      duration: '30m',
    });
  });

  it('should reject missing slo_id', () => {
    const invalidState = {
      slo_instance_id: 'test-instance-id',
      duration: '1h',
    };

    expect(() => burnRateSchema.validate(invalidState)).toThrow(/slo_id/);
  });

  it('should reject missing duration', () => {
    const invalidState = {
      slo_id: 'test-slo-id',
      slo_instance_id: '*',
    };

    expect(() => burnRateSchema.validate(invalidState)).toThrow(/duration/);
  });

  it('should default slo_instance_id to * when omitted', () => {
    const state = {
      slo_id: 'test-slo-id',
      duration: '1h',
    };

    const result = burnRateSchema.validate(state);
    expect(result.slo_instance_id).toBe('*');
  });
});
