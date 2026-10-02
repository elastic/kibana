/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawBucket } from '@kbn/grouping';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { ENTITY_GROUPING_OPTIONS } from '../../entities_table/constants';
import type { EntitiesGroupingAggregation } from '../../entities_table/grouping/use_fetch_grouped_data';
import type { FaceliftTargetMetadataMap } from './entities_table_grouping';
import { createFaceliftGroupStatsRenderer } from './entity_group_stats';

const metadata: FaceliftTargetMetadataMap = new Map([
  [
    'amber.rodriguez',
    {
      name: 'amber.rodriguez',
      type: EntityType.user,
      riskScore: 93,
      individualRiskScore: 96,
      riskChangePercent: 12,
      criticality: 'high_impact',
      alerts: 7,
      anomalies: 2,
      cases: 1,
    },
  ],
]);

const resolutionBucket = {
  key: 'amber.rodriguez',
  key_as_string: 'amber.rodriguez',
  doc_count: 3,
} as RawBucket<EntitiesGroupingAggregation>;

describe('createFaceliftGroupStatsRenderer', () => {
  it('puts risk change beside the risk score and appends remaining extras', () => {
    const renderer = createFaceliftGroupStatsRenderer(metadata);
    const stats = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, resolutionBucket);

    expect(stats.map((stat) => stat.title)).toEqual([
      'Entities:',
      'Risk score:',
      'Asset criticality:',
      'Alerts:',
      'Anomalies:',
    ]);
    expect(stats[1].component).toBeDefined();
    expect(stats[3].badge).toEqual({ value: 7, width: 50 });
    expect(stats[4].badge).toEqual({ value: 2, width: 50 });
  });

  it('does not add extras for other group types', () => {
    const renderer = createFaceliftGroupStatsRenderer(metadata);
    const stats = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, {
      key: 'user',
      doc_count: 3,
    } as RawBucket<EntitiesGroupingAggregation>);

    expect(stats.map((stat) => stat.title)).toEqual(['Entities:']);
  });
});
