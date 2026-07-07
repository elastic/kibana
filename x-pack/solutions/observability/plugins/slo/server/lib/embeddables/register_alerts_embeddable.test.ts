/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_ALERTS_EMBEDDABLE_ID } from '../../../common/embeddables/alerts/constants';
import {
  getAlertsEmbeddableTelemetry,
  registerAlertsEmbeddable,
} from './register_alerts_embeddable';

describe('registerAlertsEmbeddable', () => {
  it('registers the schema/transforms definition and the telemetry factory', () => {
    const embeddable = createEmbeddableSetupMock();

    registerAlertsEmbeddable(embeddable);

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      SLO_ALERTS_EMBEDDABLE_ID,
      expect.objectContaining({ title: 'SLO alerts' })
    );
    expect(embeddable.registerEmbeddableFactory).toHaveBeenCalledWith({
      id: SLO_ALERTS_EMBEDDABLE_ID,
      telemetry: getAlertsEmbeddableTelemetry,
    });
  });
});

describe('getAlertsEmbeddableTelemetry', () => {
  const state = (sloIds: string[]): EmbeddableStateWithType =>
    ({
      type: SLO_ALERTS_EMBEDDABLE_ID,
      slos: sloIds.map((sloId) => ({ slo_id: sloId, slo_instance_id: '*' })),
    } as unknown as EmbeddableStateWithType);

  it('counts the panel once and each referenced slo_id', () => {
    const stats = getAlertsEmbeddableTelemetry(state(['slo-1', 'slo-2']), {});

    expect(stats).toEqual({ total: 1, 'slo_id.slo-1': 1, 'slo_id.slo-2': 1 });
  });

  it('handles a panel with no slos configured yet', () => {
    const stats = getAlertsEmbeddableTelemetry(state([]), {});

    expect(stats).toEqual({ total: 1 });
  });

  it('accumulates the same slo_id across multiple panels', () => {
    let stats = {};
    stats = getAlertsEmbeddableTelemetry(state(['slo-1']), stats);
    stats = getAlertsEmbeddableTelemetry(state(['slo-1', 'slo-2']), stats);

    expect(stats).toEqual({ total: 2, 'slo_id.slo-1': 2, 'slo_id.slo-2': 1 });
  });
});
