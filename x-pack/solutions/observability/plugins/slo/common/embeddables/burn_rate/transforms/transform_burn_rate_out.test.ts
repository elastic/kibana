/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BurnRateEmbeddableState } from '../../../../server/lib/embeddables/burn_rate_schema';
import { transformBurnRateOut } from './transform_burn_rate_out';

describe('transformBurnRateOut', () => {
  it('should transform legacy camelCase state to snake_case', () => {
    expect(
      transformBurnRateOut({
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        duration: '1h',
        title: 'Test Title',
      } as unknown as BurnRateEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "duration": "1h",
        "slo_id": "legacy-slo-id",
        "slo_instance_id": "legacy-instance-id",
        "title": "Test Title",
      }
    `);
  });

  it('should return state unchanged when already in snake_case', () => {
    expect(
      transformBurnRateOut({
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        duration: '6h',
        title: 'Test Title',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "duration": "6h",
        "slo_id": "new-slo-id",
        "slo_instance_id": "new-instance-id",
        "title": "Test Title",
      }
    `);
  });

  it('should prefer snake_case fields over legacy camelCase when both are present', () => {
    expect(
      transformBurnRateOut({
        slo_id: 'new-slo-id',
        sloId: 'legacy-slo-id',
        slo_instance_id: 'new-instance-id',
        sloInstanceId: 'legacy-instance-id',
        duration: '1h',
      } as unknown as BurnRateEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "duration": "1h",
        "slo_id": "new-slo-id",
        "slo_instance_id": "new-instance-id",
      }
    `);
  });

  it('should handle legacy state with only sloId (no sloInstanceId)', () => {
    expect(
      transformBurnRateOut({
        sloId: 'legacy-slo-id',
        duration: '30m',
      } as unknown as BurnRateEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "duration": "30m",
        "slo_id": "legacy-slo-id",
      }
    `);
  });

  it('should handle snake_case state with only slo_id (no slo_instance_id)', () => {
    expect(
      transformBurnRateOut({
        slo_id: 'new-slo-id',
        duration: '1h',
      } as BurnRateEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "duration": "1h",
        "slo_id": "new-slo-id",
      }
    `);
  });
});
