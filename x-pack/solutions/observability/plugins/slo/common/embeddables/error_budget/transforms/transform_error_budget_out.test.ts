/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorBudgetEmbeddableState } from '../../../../server/lib/embeddables/error_budget_schema';
import { transformErrorBudgetOut } from './transform_error_budget_out';

describe('transformErrorBudgetOut', () => {
  it('should transform legacy camelCase state to snake_case', () => {
    expect(
      transformErrorBudgetOut({
        sloId: 'legacy-slo-id',
        sloInstanceId: 'legacy-instance-id',
        title: 'Test Title',
      } as unknown as ErrorBudgetEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "slo_id": "legacy-slo-id",
        "slo_instance_id": "legacy-instance-id",
        "title": "Test Title",
      }
    `);
  });

  it('should return state unchanged when already in snake_case', () => {
    expect(
      transformErrorBudgetOut({
        slo_id: 'new-slo-id',
        slo_instance_id: 'new-instance-id',
        title: 'Test Title',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "slo_id": "new-slo-id",
        "slo_instance_id": "new-instance-id",
        "title": "Test Title",
      }
    `);
  });

  it('should prefer snake_case fields over legacy camelCase when both are present', () => {
    expect(
      transformErrorBudgetOut({
        slo_id: 'new-slo-id',
        sloId: 'legacy-slo-id',
        slo_instance_id: 'new-instance-id',
        sloInstanceId: 'legacy-instance-id',
      } as unknown as ErrorBudgetEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "slo_id": "new-slo-id",
        "slo_instance_id": "new-instance-id",
      }
    `);
  });

  it('should handle legacy state with only sloId (no sloInstanceId)', () => {
    expect(
      transformErrorBudgetOut({
        sloId: 'legacy-slo-id',
      } as unknown as ErrorBudgetEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "slo_id": "legacy-slo-id",
      }
    `);
  });

  it('should handle snake_case state with only slo_id (no slo_instance_id)', () => {
    expect(
      transformErrorBudgetOut({
        slo_id: 'new-slo-id',
      } as unknown as ErrorBudgetEmbeddableState)
    ).toMatchInlineSnapshot(`
      Object {
        "slo_id": "new-slo-id",
      }
    `);
  });
});
