/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_ERROR_BUDGET_ID } from '../../../common/embeddables/error_budget/constants';
import {
  getErrorBudgetEmbeddableTelemetry,
  registerErrorBudgetEmbeddable,
} from './register_error_budget_embeddable';

describe('registerErrorBudgetEmbeddable', () => {
  it('registers the schema/transforms definition and the telemetry factory', () => {
    const embeddable = createEmbeddableSetupMock();

    registerErrorBudgetEmbeddable(embeddable);

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      SLO_ERROR_BUDGET_ID,
      expect.objectContaining({ title: 'SLO error budget' })
    );
    expect(embeddable.registerEmbeddableFactory).toHaveBeenCalledWith({
      id: SLO_ERROR_BUDGET_ID,
      telemetry: getErrorBudgetEmbeddableTelemetry,
    });
  });
});

describe('getErrorBudgetEmbeddableTelemetry', () => {
  const state = (sloId: string): EmbeddableStateWithType =>
    ({
      type: SLO_ERROR_BUDGET_ID,
      slo_id: sloId,
      slo_instance_id: '*',
    } as unknown as EmbeddableStateWithType);

  it('counts the panel and its slo_id', () => {
    const stats = getErrorBudgetEmbeddableTelemetry(state('slo-1'), {});

    expect(stats).toEqual({ total: 1, 'slo_id.slo-1': 1 });
  });

  it('ignores state missing a slo_id without throwing', () => {
    const stats = getErrorBudgetEmbeddableTelemetry(
      { type: SLO_ERROR_BUDGET_ID } as EmbeddableStateWithType,
      {}
    );

    expect(stats).toEqual({ total: 1 });
  });
});
