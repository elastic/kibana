/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntitySummaryAttribute } from './entity.gen';
import {
  buildEntitySummaryStaleness,
  computeEntitySummaryStalenessReasons,
} from './entity_summary_staleness';

describe('entity_summary_staleness', () => {
  describe('buildEntitySummaryStaleness', () => {
    it('builds snapshot only for enabled signals', () => {
      expect(
        buildEntitySummaryStaleness(
          {
            riskLevel: 'high',
            anomalyJobIds: ['job-a'],
            ruleNames: ['Rule A'],
          },
          ['risk_level']
        )
      ).toEqual({
        enabled_signals: ['risk_level'],
        snapshot: { risk_level: 'high' },
      });
    });
  });

  describe('computeEntitySummaryStalenessReasons', () => {
    it('returns no reasons when staleness is missing', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
      } as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, { riskLevel: 'high' })).toEqual([]);
    });

    it('detects risk level change when risk_level is enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_level'],
          snapshot: { risk_level: 'low' },
        },
      } as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, { riskLevel: 'high' })).toEqual([
        'Risk level changed from low to high',
      ]);
    });

    it('ignores anomaly jobs when not enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_level'],
          snapshot: { risk_level: 'low', anomaly_job_ids: [] },
        },
      } as EntitySummaryAttribute;

      expect(
        computeEntitySummaryStalenessReasons(summary, {
          riskLevel: 'low',
          anomalyJobIds: ['new-job'],
        })
      ).toEqual([]);
    });

    it('detects risk score change when risk_score is enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_score'],
          snapshot: { risk_score: 70 },
        },
      } as EntitySummaryAttribute;

      expect(
        computeEntitySummaryStalenessReasons(summary, { riskScore: 82.97 })
      ).toEqual(['Risk score changed from 70 to 82.97']);
    });

    it('ignores risk score changes within epsilon', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_score'],
          snapshot: { risk_score: 70 },
        },
      } as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, { riskScore: 70.005 })).toEqual([]);
    });

    it('builds risk_score snapshot when enabled', () => {
      expect(
        buildEntitySummaryStaleness(
          { riskLevel: 'high', riskScore: 82.97 },
          ['risk_score']
        )
      ).toEqual({
        enabled_signals: ['risk_score'],
        snapshot: { risk_score: 82.97 },
      });
    });

    it('does not flag stale when risk level is cleared', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_level'],
          snapshot: { risk_level: 'high' },
        },
      } as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, { riskLevel: null })).toEqual([]);
    });

    it('does not flag stale when anomaly jobs are removed', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['anomaly_jobs'],
          snapshot: { anomaly_job_ids: ['job-a', 'job-b'] },
        },
      } as EntitySummaryAttribute;

      expect(
        computeEntitySummaryStalenessReasons(summary, {
          anomalyJobIds: ['job-a'],
        })
      ).toEqual([]);
    });

    it('ignores unknown enabled signal ids from stored documents', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['future_signal'],
          snapshot: {},
        },
      } as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, { riskLevel: 'high' })).toEqual([]);
    });

    it('detects new anomaly jobs when anomaly_jobs is enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['anomaly_jobs'],
          snapshot: { anomaly_job_ids: ['job-a'] },
        },
      } as EntitySummaryAttribute;

      expect(
        computeEntitySummaryStalenessReasons(summary, {
          anomalyJobIds: ['job-a', 'job-b'],
        })
      ).toEqual(['1 new ML anomaly job(s) have fired']);
    });
  });
});
