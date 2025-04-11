/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';

import type { LegendItem } from '../../../../../../../common/components/charts/draggable_legend_item';
import { getRiskScorePalette, RISK_SCORE_STEPS } from '../chart_palette';
import { bucketsWithStackByField1, maxRiskSubAggregations } from '../flatten/mocks/mock_buckets';
import {
  getFirstGroupLegendItems,
  getLegendItemFromRawBucket,
  getLegendItemFromFlattenedBucket,
  getLegendMap,
} from '.';
import type { FlattenedBucket, RawBucket } from '../../types';
import { TableId } from '@kbn/securitysolution-data-table';
import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';

describe('legend', () => {
  const { result } = renderHook(() => useEuiTheme());
  const euiTheme = result.current.euiTheme;
  const colorPalette = getRiskScorePalette(RISK_SCORE_STEPS, euiTheme);

  describe('getLegendItemFromRawBucket', () => {
    const bucket: RawBucket = {
      key: '1658955590866',
      key_as_string: '2022-07-27T20:59:50.866Z', // <-- should be preferred over `key` when present
      doc_count: 1,
      maxRiskSubAggregation: { value: 21 },
      stackByField1: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [{ key: 'Host-vmdx1cnu3m', doc_count: 1 }],
      },
    };

    it('returns an undefined color when showColor is false', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: false,
          stackByField0: 'kibana.alert.rule.name',
        }).color
      ).toBeUndefined();
    });

    it('returns the expected color when showColor is true', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).color
      ).toEqual('#54B399');
    });

    it('returns the expected count', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).count
      ).toEqual(34);
    });

    it('returns the expected dataProviderId', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).dataProviderId
      ).toContain('draggable-legend-item-treemap-kibana_alert_rule_name-matches everything-');
    });

    it('renders the expected label', () => {
      const item = getLegendItemFromRawBucket({
        bucket: bucketsWithStackByField1[0],
        colorPalette,
        maxRiskSubAggregations,
        showColor: true,
        stackByField0: 'kibana.alert.rule.name',
      });

      expect(item.render != null && item.render()).toEqual(`matches everything (Risk 21)`);
    });

    it('prefers `key_as_string` over `key` when rendering the label', () => {
      const item = getLegendItemFromRawBucket({
        bucket,
        colorPalette,
        maxRiskSubAggregations,
        showColor: true,
        stackByField0: '@timestamp',
      });

      expect(item.render != null && item.render()).toEqual(`${bucket.key_as_string} (Risk 21)`);
    });

    it('returns the expected field', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).field
      ).toEqual('kibana.alert.rule.name');
    });

    it('returns the expected value', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket: bucketsWithStackByField1[0],
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: 'kibana.alert.rule.name',
        }).value
      ).toEqual('matches everything');
    });

    it('prefers `key_as_string` over `key` when populating value', () => {
      expect(
        getLegendItemFromRawBucket({
          bucket,
          colorPalette,
          maxRiskSubAggregations,
          showColor: true,
          stackByField0: '@timestamp',
        }).value
      ).toEqual(bucket.key_as_string);
    });
  });

  describe('getLegendItemFromFlattenedBucket', () => {
    const flattenedBucket: FlattenedBucket = {
      doc_count: 34,
      key: 'matches everything',
      maxRiskSubAggregation: { value: 21 },
      stackByField1DocCount: 12,
      stackByField1Key: 'Host-k8iyfzraq9',
    };

    it('returns the expected legend item', () => {
      expect(
        omit(
          ['render', 'dataProviderId'],
          getLegendItemFromFlattenedBucket({
            colorPalette,
            flattenedBucket,
            maxRiskSubAggregations,
            stackByField0: 'kibana.alert.rule.name',
            stackByField1: 'host.name',
          })
        )
      ).toEqual({
        color: '#54B399',
        count: 12,
        field: 'host.name',
        value: 'Host-k8iyfzraq9',
        scopeId: TableId.alertsOnAlertsPage,
      });
    });

    it('returns the expected render function', () => {
      const legendItem = getLegendItemFromFlattenedBucket({
        colorPalette,
        flattenedBucket,
        maxRiskSubAggregations,
        stackByField0: 'kibana.alert.rule.name',
        stackByField1: 'host.name',
      });

      expect(legendItem.render != null && legendItem.render()).toEqual('Host-k8iyfzraq9');
    });

    it('returns the expected dataProviderId', () => {
      const legendItem = getLegendItemFromFlattenedBucket({
        colorPalette,
        flattenedBucket,
        maxRiskSubAggregations,
        stackByField0: 'kibana.alert.rule.name',
        stackByField1: 'host.name',
      });

      expect(legendItem.dataProviderId).toContain(
        'draggable-legend-item-treemap-matches everything-Host-k8iyfzraq9-'
      );
    });
  });

  describe('getFirstGroupLegendItems', () => {
    it('returns the expected legend item', () => {
      expect(
        getFirstGroupLegendItems({
          buckets: bucketsWithStackByField1,
          colorPalette,
          maxRiskSubAggregations,
          stackByField0: 'kibana.alert.rule.name',
        }).map((x) => omit(['render', 'dataProviderId'], x))
      ).toEqual([
        {
          color: '#54B399',
          count: 34,
          field: 'kibana.alert.rule.name',
          value: 'matches everything',
          scopeId: TableId.alertsOnAlertsPage,
        },
        {
          color: '#DA8B45',
          count: 28,
          field: 'kibana.alert.rule.name',
          value: 'EQL process sequence',
          scopeId: TableId.alertsOnAlertsPage,
        },
        {
          color: '#D6BF57',
          count: 19,
          field: 'kibana.alert.rule.name',
          value: 'Endpoint Security',
          scopeId: TableId.alertsOnAlertsPage,
        },
        {
          color: '#E7664C',
          count: 5,
          field: 'kibana.alert.rule.name',
          value: 'mimikatz process started',
          scopeId: TableId.alertsOnAlertsPage,
        },
        {
          color: '#E7664C',
          count: 1,
          field: 'kibana.alert.rule.name',
          value: 'Threshold rule',
          scopeId: TableId.alertsOnAlertsPage,
        },
      ]);
    });

    it('returns the expected render function', () => {
      expect(
        getFirstGroupLegendItems({
          buckets: bucketsWithStackByField1,
          colorPalette,
          maxRiskSubAggregations,
          stackByField0: 'kibana.alert.rule.name',
        }).map((x) => (x.render != null ? x.render() : null))
      ).toEqual([
        'matches everything (Risk 21)',
        'EQL process sequence (Risk 73)',
        'Endpoint Security (Risk 47)',
        'mimikatz process started (Risk 99)',
        'Threshold rule (Risk 99)',
      ]);
    });
  });

  describe('getLegendMap', () => {
    it('returns the expected legend item', () => {
      const expected: Record<
        string,
        Array<Pick<LegendItem, 'color' | 'count' | 'field' | 'value' | 'scopeId'>>
      > = {
        'matches everything': [
          {
            color: undefined,
            count: 34,
            field: 'kibana.alert.rule.name',
            value: 'matches everything',
            scopeId: TableId.alertsOnAlertsPage,
          },
        ],
        'EQL process sequence': [
          {
            color: undefined,
            count: 28,
            field: 'kibana.alert.rule.name',
            value: 'EQL process sequence',
            scopeId: TableId.alertsOnAlertsPage,
          },
        ],
        'Endpoint Security': [
          {
            color: undefined,
            count: 19,
            field: 'kibana.alert.rule.name',
            value: 'Endpoint Security',
            scopeId: TableId.alertsOnAlertsPage,
          },
        ],
        'mimikatz process started': [
          {
            color: undefined,
            count: 5,
            field: 'kibana.alert.rule.name',
            value: 'mimikatz process started',
            scopeId: TableId.alertsOnAlertsPage,
          },
        ],
        'Threshold rule': [
          {
            color: undefined,
            count: 1,
            field: 'kibana.alert.rule.name',
            value: 'Threshold rule',
            scopeId: TableId.alertsOnAlertsPage,
          },
        ],
      };

      const legendMap = getLegendMap({
        buckets: bucketsWithStackByField1,
        colorPalette,
        maxRiskSubAggregations,
        stackByField0: 'kibana.alert.rule.name',
      });

      Object.keys(expected).forEach((key) => {
        expect(omit(['render', 'dataProviderId'], legendMap[key][0])).toEqual(expected[key][0]);
      });
    });
  });
});
