/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';

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
      const { result } = renderHook(() => useGroupStats());
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
    it('returns the correct stats item with count', () => {
      const { result } = renderHook(() => useGroupStats());
      const renderer = result.current.renderer;
      const bucket = {
        key: 'some-key',
        doc_count: 10,
        attackRelatedAlerts: {
          doc_count: 5,
        },
      };

      const stats = renderer('some audit', bucket);

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

    it('returns 0 when attackRelatedAlerts is missing', () => {
      const { result } = renderHook(() => useGroupStats());
      const renderer = result.current.renderer;
      const bucket = {
        key: 'some-key',
        doc_count: 10,
      };

      const stats = renderer('some audit', bucket);

      expect(stats[0].badge?.value).toBe(0);
    });
  });
});
