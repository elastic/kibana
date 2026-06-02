/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import type { RawBucket } from '@kbn/grouping';
import type { AlertsGroupingAggregation } from '../../../alerts_table/grouping_settings/types';

import { useGroupStats } from './use_group_stats';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({
    euiTheme: {
      colors: {
        danger: 'red',
      },
    },
  }),
}));

describe('useGroupStats', () => {
  describe('aggregations', () => {
    it('returns the correct aggregations configuration', () => {
      const getAttack = jest.fn();
      const { result } = renderHook(() => useGroupStats({ getAttack }));
      const aggregations = result.current.aggregations();

      expect(aggregations).toEqual([
        { latestTimestamp: { max: { field: '@timestamp' } } },
        {
          attacks: {
            filter: {
              term: { 'kibana.alert.rule.rule_type_id': ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID },
            },
          },
        },
        {
          attackRelatedAlerts: {
            filter: {
              bool: {
                must_not: {
                  term: {
                    'kibana.alert.rule.rule_type_id': ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
                  },
                },
              },
            },
          },
        },
      ]);
    });
  });

  describe('renderer', () => {
    it('returns the correct stats item with count when no attack is found', () => {
      const getAttack = jest.fn().mockReturnValue(undefined);
      const { result } = renderHook(() => useGroupStats({ getAttack }));
      const renderer = result.current.renderer;
      const bucket = {
        key: 'some-key',
        doc_count: 10,
        attackRelatedAlerts: {
          doc_count: 5,
        },
      };

      const stats = renderer(
        'some audit',
        bucket as unknown as RawBucket<AlertsGroupingAggregation>
      );

      expect(stats).toHaveLength(1);
      expect(stats[0]).toEqual({
        title: 'Alerts:',
        badge: {
          value: 5,
          width: 50,
          color: 'red',
        },
      });
    });

    it('returns the correct stats item with count from attack document when attack is found', () => {
      const getAttack = jest.fn().mockReturnValue({ alertIds: ['alert-1', 'alert-2', 'alert-3'] });
      const { result } = renderHook(() => useGroupStats({ getAttack }));
      const renderer = result.current.renderer;
      const bucket = {
        key: 'some-key',
        doc_count: 10,
        attackRelatedAlerts: {
          doc_count: 1, // smaller than actual related alerts due to filters
        },
      };

      const stats = renderer(
        'some audit',
        bucket as unknown as RawBucket<AlertsGroupingAggregation>
      );

      expect(stats).toHaveLength(1);
      expect(stats[0]).toEqual({
        title: 'Alerts:',
        badge: {
          value: 3,
          width: 50,
          color: 'red',
        },
      });
    });

    it('returns 0 when attackRelatedAlerts is missing and no attack is found', () => {
      const getAttack = jest.fn().mockReturnValue(undefined);
      const { result } = renderHook(() => useGroupStats({ getAttack }));
      const renderer = result.current.renderer;
      const bucket = {
        key: 'some-key',
        doc_count: 10,
      };

      const stats = renderer(
        'some audit',
        bucket as unknown as RawBucket<AlertsGroupingAggregation>
      );

      expect(stats[0].badge?.value).toBe(0);
    });
  });
});
