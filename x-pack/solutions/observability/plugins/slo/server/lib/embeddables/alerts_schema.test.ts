/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getAlertsEmbeddableSchema } from './alerts_schema';

describe('alerts schema validation', () => {
  const alertsEmbeddableSchema = getAlertsEmbeddableSchema(mockGetDrilldownsSchema);

  it('should validate a valid state with slos', () => {
    const validState = {
      slos: [
        { slo_id: 'slo-1', slo_instance_id: '*' },
        { slo_id: 'slo-2', slo_instance_id: 'instance-abc' },
      ],
    };

    expect(() => alertsEmbeddableSchema.validate(validState)).not.toThrow();
    const result = alertsEmbeddableSchema.validate(validState);
    expect(result.slos).toHaveLength(2);
    expect(result.slos[0]).toEqual({ slo_id: 'slo-1', slo_instance_id: '*' });
    expect(result.slos[1]).toEqual({ slo_id: 'slo-2', slo_instance_id: 'instance-abc' });
  });

  it('should default slo_instance_id to * when omitted in a slo item', () => {
    const state = {
      slos: [{ slo_id: 'slo-1' }],
    };

    expect(() => alertsEmbeddableSchema.validate(state)).not.toThrow();
    const result = alertsEmbeddableSchema.validate(state);
    expect(result.slos).toHaveLength(1);
    expect(result.slos[0]).toEqual({ slo_id: 'slo-1', slo_instance_id: '*' });
  });

  it('should default slo_instance_id to * for each item when omitted in multiple items', () => {
    const state = {
      slos: [{ slo_id: 'slo-1' }, { slo_id: 'slo-2' }],
    };

    const result = alertsEmbeddableSchema.validate(state);
    expect(result.slos[0]).toEqual({ slo_id: 'slo-1', slo_instance_id: '*' });
    expect(result.slos[1]).toEqual({ slo_id: 'slo-2', slo_instance_id: '*' });
  });

  it('should validate empty slos array', () => {
    const state = { slos: [] };

    expect(() => alertsEmbeddableSchema.validate(state)).not.toThrow();
    const result = alertsEmbeddableSchema.validate(state);
    expect(result.slos).toEqual([]);
  });

  it('should default slos to empty array when omitted', () => {
    const state = {};

    expect(() => alertsEmbeddableSchema.validate(state)).not.toThrow();
    const result = alertsEmbeddableSchema.validate(state);
    expect(result.slos).toEqual([]);
  });

  it('should reject missing slo_id in a slo item', () => {
    const invalidState = {
      slos: [{ slo_instance_id: '*' }],
    };

    expect(() => alertsEmbeddableSchema.validate(invalidState)).toThrow(/slo_id/);
  });
});
