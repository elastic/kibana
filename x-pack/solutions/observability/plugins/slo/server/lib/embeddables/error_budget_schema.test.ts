/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getErrorBudgetEmbeddableSchema } from './error_budget_schema';

describe('error budget schema validation', () => {
  const errorBudgetSchema = getErrorBudgetEmbeddableSchema(mockGetDrilldownsSchema);

  it('should validate a valid error budget state with all fields', () => {
    const validState = {
      slo_id: 'test-slo-id',
      slo_instance_id: 'test-instance-id',
      title: 'Error Budget Panel',
      hide_title: false,
    };

    expect(() => errorBudgetSchema.validate(validState)).not.toThrow();
    const result = errorBudgetSchema.validate(validState);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      slo_instance_id: 'test-instance-id',
      title: 'Error Budget Panel',
      hide_title: false,
    });
  });

  it('should validate with minimal required fields and apply slo_instance_id default', () => {
    const minimalState = {
      slo_id: 'test-slo-id',
    };

    expect(() => errorBudgetSchema.validate(minimalState)).not.toThrow();
    const result = errorBudgetSchema.validate(minimalState);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      slo_instance_id: '*',
    });
  });

  it('should validate with slo_id and slo_instance_id only', () => {
    const state = {
      slo_id: 'test-slo-id',
      slo_instance_id: 'instance-abc',
    };

    expect(() => errorBudgetSchema.validate(state)).not.toThrow();
    const result = errorBudgetSchema.validate(state);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      slo_instance_id: 'instance-abc',
    });
  });

  it('should validate with title fields only (besides slo_id)', () => {
    const state = {
      slo_id: 'test-slo-id',
      title: 'My Custom Title',
      hide_title: true,
    };

    expect(() => errorBudgetSchema.validate(state)).not.toThrow();
    const result = errorBudgetSchema.validate(state);
    expect(result).toMatchObject({
      slo_id: 'test-slo-id',
      title: 'My Custom Title',
      hide_title: true,
    });
  });

  it('should reject missing slo_id', () => {
    const invalidState = {
      slo_instance_id: 'test-instance-id',
    };

    expect(() => errorBudgetSchema.validate(invalidState)).toThrow(/slo_id/);
  });

  it('should default slo_instance_id to * when omitted', () => {
    const state = {
      slo_id: 'test-slo-id',
    };

    const result = errorBudgetSchema.validate(state);
    expect(result.slo_instance_id).toBe('*');
  });
});
