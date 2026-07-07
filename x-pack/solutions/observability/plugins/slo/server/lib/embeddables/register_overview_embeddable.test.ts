/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/server';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../common/embeddables/overview/constants';
import {
  getOverviewEmbeddableTelemetry,
  registerOverviewEmbeddable,
} from './register_overview_embeddable';

describe('registerOverviewEmbeddable', () => {
  it('registers the schema/transforms definition and the telemetry factory', () => {
    const embeddable = createEmbeddableSetupMock();

    registerOverviewEmbeddable(embeddable);

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      SLO_OVERVIEW_EMBEDDABLE_ID,
      expect.objectContaining({ title: 'SLO overview' })
    );
    expect(embeddable.registerEmbeddableFactory).toHaveBeenCalledWith({
      id: SLO_OVERVIEW_EMBEDDABLE_ID,
      telemetry: getOverviewEmbeddableTelemetry,
    });
  });
});

describe('getOverviewEmbeddableTelemetry', () => {
  const singleState = (sloId: string): EmbeddableStateWithType =>
    ({
      type: SLO_OVERVIEW_EMBEDDABLE_ID,
      overview_mode: 'single',
      slo_id: sloId,
    } as unknown as EmbeddableStateWithType);

  const groupState = (): EmbeddableStateWithType =>
    ({
      type: SLO_OVERVIEW_EMBEDDABLE_ID,
      overview_mode: 'groups',
    } as unknown as EmbeddableStateWithType);

  it('counts a single-SLO panel and its slo_id', () => {
    const stats = getOverviewEmbeddableTelemetry(singleState('slo-1'), {});

    expect(stats).toEqual({ total: 1, 'slo_id.slo-1': 1 });
  });

  it('counts a group-mode panel without a slo_id breakdown', () => {
    const stats = getOverviewEmbeddableTelemetry(groupState(), {});

    expect(stats).toEqual({ total: 1, groups: 1 });
  });

  it('accumulates across multiple panels, matching the reference reducer pattern', () => {
    let stats = {};
    stats = getOverviewEmbeddableTelemetry(singleState('slo-1'), stats);
    stats = getOverviewEmbeddableTelemetry(singleState('slo-1'), stats);
    stats = getOverviewEmbeddableTelemetry(singleState('slo-2'), stats);
    stats = getOverviewEmbeddableTelemetry(groupState(), stats);

    expect(stats).toEqual({
      total: 4,
      'slo_id.slo-1': 2,
      'slo_id.slo-2': 1,
      groups: 1,
    });
  });

  it('does not mutate the incoming stats object', () => {
    const initialStats = { total: 1 };

    getOverviewEmbeddableTelemetry(singleState('slo-1'), initialStats);

    expect(initialStats).toEqual({ total: 1 });
  });
});
