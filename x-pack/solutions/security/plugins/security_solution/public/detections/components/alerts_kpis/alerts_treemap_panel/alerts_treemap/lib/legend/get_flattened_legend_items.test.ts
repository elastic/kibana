/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import type { LegendItem } from '../../../../../../../common/components/charts/draggable_legend_item';
import { getRiskScorePalette, RISK_SCORE_STEPS } from '../chart_palette';
import { getFlattenedLegendItems } from './get_flattened_legend_items';
import { bucketsWithStackByField1, maxRiskSubAggregations } from '../flatten/mocks/mock_buckets';
import { flattenedBuckets } from '../flatten/mocks/mock_flattened_buckets';
import { TableId } from '@kbn/securitysolution-data-table';
import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';

describe('getFlattenedLegendItems', () => {
  it('returns the expected legend items', () => {
    const expected: Array<Pick<LegendItem, 'color' | 'count' | 'field' | 'value' | 'scopeId'>> = [
      {
        color: undefined,
        count: 34,
        field: 'kibana.alert.rule.name',
        value: 'matches everything',
      },
      {
        color: '#54B399',
        count: 12,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#54B399',
        count: 10,
        field: 'host.name',
        value: 'Host-ao1a4wu7vn',
      },
      {
        color: '#54B399',
        count: 7,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#54B399',
        count: 5,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        color: undefined,
        count: 28,
        field: 'kibana.alert.rule.name',
        value: 'EQL process sequence',
      },
      {
        color: '#FF7E62',
        count: 10,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#FF7E62',
        count: 7,
        field: 'host.name',
        value: 'Host-ao1a4wu7vn',
      },
      {
        color: '#FF7E62',
        count: 5,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#FF7E62',
        count: 3,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        color: undefined,
        count: 19,
        field: 'kibana.alert.rule.name',
        value: 'Endpoint Security',
      },
      {
        color: '#F1D86F',
        count: 11,
        field: 'host.name',
        value: 'Host-ao1a4wu7vn',
      },
      {
        color: '#F1D86F',
        count: 6,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#F1D86F',
        count: 1,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#F1D86F',
        count: 1,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        color: undefined,
        count: 5,
        field: 'kibana.alert.rule.name',
        value: 'mimikatz process started',
      },
      {
        color: '#bd271e',
        count: 3,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
      },
      {
        color: '#bd271e',
        count: 1,
        field: 'host.name',
        value: 'Host-3fbljiq8rj',
      },
      {
        color: '#bd271e',
        count: 1,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
      {
        color: undefined,
        count: 1,
        field: 'kibana.alert.rule.name',
        value: 'Threshold rule',
      },
      {
        color: '#bd271e',
        count: 1,
        field: 'host.name',
        value: 'Host-r4y6xi92ob',
      },
    ].map((legend) => ({ ...legend, scopeId: TableId.alertsOnAlertsPage }));
    const { result: euiThemeResult } = renderHook(() => useEuiTheme());
    const euiTheme = euiThemeResult.current.euiTheme;
    const legendItems = getFlattenedLegendItems({
      buckets: bucketsWithStackByField1,
      colorPalette: getRiskScorePalette(RISK_SCORE_STEPS, euiTheme),
      flattenedBuckets,
      maxRiskSubAggregations,
      stackByField0: 'kibana.alert.rule.name',
      stackByField1: 'host.name',
    });

    expect(legendItems.map((x) => omit(['render', 'dataProviderId'], x))).toEqual(expected);
  });
});
