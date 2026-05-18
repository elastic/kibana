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
            riskScore: 82.97,
            anomalyJobIds: ['job-a'],
            ruleNames: ['Rule A'],
          },
          ['risk_score']
        )
      ).toEqual({
        enabled_signals: ['risk_score'],
        snapshot: { risk_score: 82.97 },
      });
    });
  });

  describe('computeEntitySummaryStalenessReasons', () => {
    it('returns no reasons when staleness is missing', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
      } as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, {})).toEqual([]);
    });

    it('ignores anomaly jobs when not enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['risk_score'],
          snapshot: { risk_score: 70, anomaly_job_ids: [] },
        },
      } as EntitySummaryAttribute;

      expect(
        computeEntitySummaryStalenessReasons(summary, {
          riskScore: 70,
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
        buildEntitySummaryStaleness({ riskScore: 82.97 }, ['risk_score'])
      ).toEqual({
        enabled_signals: ['risk_score'],
        snapshot: { risk_score: 82.97 },
      });
    });

    it('does not flag stale when anomaly jobs are removed', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['anomaly_job_ids'],
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
      } as unknown as EntitySummaryAttribute;

      expect(computeEntitySummaryStalenessReasons(summary, {})).toEqual([]);
    });

    it('detects new anomaly jobs when anomaly_job_ids is enabled', () => {
      const summary = {
        highlights: [{ title: 'T', text: 'x' }],
        staleness: {
          enabled_signals: ['anomaly_job_ids'],
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
