/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from '../../../common/embeddables/burn_rate/constants';
import {
  getBurnRateEmbeddableTelemetry,
  registerBurnRateEmbeddable,
} from './register_burn_rate_embeddable';

describe('registerBurnRateEmbeddable', () => {
  it('registers the schema/transforms definition and the telemetry factory', () => {
    const embeddable = createEmbeddableSetupMock();

    registerBurnRateEmbeddable(embeddable);

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      SLO_BURN_RATE_EMBEDDABLE_ID,
      expect.objectContaining({ title: 'SLO burn rate' })
    );
    expect(embeddable.registerEmbeddableFactory).toHaveBeenCalledWith({
      id: SLO_BURN_RATE_EMBEDDABLE_ID,
      telemetry: getBurnRateEmbeddableTelemetry,
    });
  });
});

describe('getBurnRateEmbeddableTelemetry', () => {
  const state = (sloId: string): EmbeddableStateWithType =>
    ({
      type: SLO_BURN_RATE_EMBEDDABLE_ID,
      slo_id: sloId,
      slo_instance_id: '*',
      duration: '1h',
    } as unknown as EmbeddableStateWithType);

  it('counts the panel and its slo_id', () => {
    const stats = getBurnRateEmbeddableTelemetry(state('slo-1'), {});

    expect(stats).toEqual({ total: 1, 'slo_id.slo-1': 1 });
  });

  it('accumulates counts across multiple panels for the same slo_id', () => {
    let stats = {};
    stats = getBurnRateEmbeddableTelemetry(state('slo-1'), stats);
    stats = getBurnRateEmbeddableTelemetry(state('slo-1'), stats);

    expect(stats).toEqual({ total: 2, 'slo_id.slo-1': 2 });
  });
});
