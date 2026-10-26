/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import {
  REACHES_BACK_COLUMN,
  buildAlertsHistoryReachesBackQuery,
  buildAnomaliesHistoryReachesBackQuery,
  buildNewEntityHistoryReachesBackQuery,
} from './history_reaches_back';

const RANGES: Array<[TimeRange, string]> = [
  ['24h', 'NOW() - 2 days'],
  ['7d', 'NOW() - 14 days'],
  ['30d', 'NOW() - 60 days'],
];

describe('history checks', () => {
  it('return one boolean column', () => {
    expect(REACHES_BACK_COLUMN).toBe('reaches_back');
  });

  describe.each(RANGES)('over %s', (range, start) => {
    it('asks whether the oldest alert is older than the start of the previous period', () => {
      expect(buildAlertsHistoryReachesBackQuery('my-space', range)).toBe(
        [
          'FROM .alerts-security.alerts-my-space',
          '| STATS oldest = MIN(@timestamp)',
          `| EVAL reaches_back = COALESCE(oldest <= ${start}, false)`,
          '| KEEP reaches_back',
        ].join('\n')
      );
    });

    it('asks whether the oldest anomaly record of the installed jobs is older than that', () => {
      const query = buildAnomaliesHistoryReachesBackQuery(range, ['job_a', 'job_b']);
      expect(query).toContain('FROM .ml-anomalies-shared*');
      expect(query).toContain('job_id IN ("job_a", "job_b")');
      expect(query).toContain('result_type == "record" AND is_interim == false');
      expect(query).toContain('| STATS oldest = MIN(@timestamp)');
      expect(query).toContain(`| EVAL reaches_back = COALESCE(oldest <= ${start}, false)`);
    });

    it('does not apply the tile score threshold: old low-score records still show the history', () => {
      expect(buildAnomaliesHistoryReachesBackQuery(range, ['job_a'])).not.toContain('record_score');
    });

    it('asks whether the oldest entity was first seen before that', () => {
      expect(buildNewEntityHistoryReachesBackQuery('.entities-v1', range)).toBe(
        [
          'FROM .entities-v1',
          '| STATS oldest = MIN(entity.lifecycle.first_seen)',
          `| EVAL reaches_back = COALESCE(oldest <= ${start}, false)`,
          '| KEEP reaches_back',
        ].join('\n')
      );
    });
  });

  it('never counts the docs, so the cost does not grow with the data', () => {
    expect(buildAlertsHistoryReachesBackQuery('default', '30d')).not.toContain('COUNT');
    expect(buildNewEntityHistoryReachesBackQuery('.e', '30d')).not.toContain('COUNT');
  });
});
