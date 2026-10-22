/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { RISK_SCORE_HISTORY_URL } from '@kbn/security-solution-plugin/common/entity_analytics/risk_score/constants';
import { deleteAllRiskScores, riskEngineRouteHelpersFactory } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  const RISK_SCORE_TIME_SERIES_INDEX = 'risk-score.risk-score-default';
  const ENTITY_ID = 'host-test-entity-id';
  // Two documents seeded inside a single hourly bucket to exercise max-score selection.
  const BUCKET_ENTITY_ID = 'host-bucket-entity-id';

  const sampleInputs = [
    {
      id: 'alert-1',
      index: '.internal.alerts-security.alerts-default-000001',
      category: 'category_1',
      description: 'Generated from Detection Engine Rule: Test Rule',
      risk_score: 21,
      contribution_score: 10.5,
    },
  ];

  const sampleModifiers = [
    {
      type: 'asset_criticality',
      contribution: 5.5,
      metadata: { criticality_level: 'high_impact' },
    },
  ];

  const seedRiskScoreDoc = ({
    timestamp,
    scoreNorm,
    level,
    scoreType,
    entityId = ENTITY_ID,
    withContributions = false,
  }: {
    timestamp: string;
    scoreNorm: number;
    level: string;
    scoreType?: string;
    entityId?: string;
    withContributions?: boolean;
  }) =>
    es.index({
      index: RISK_SCORE_TIME_SERIES_INDEX,
      op_type: 'create',
      refresh: true,
      document: {
        '@timestamp': timestamp,
        host: {
          name: entityId,
          risk: {
            id_field: 'entity.id',
            id_value: entityId,
            calculated_level: level,
            calculated_score: scoreNorm * 2,
            calculated_score_norm: scoreNorm,
            category_1_score: scoreNorm,
            category_1_count: 1,
            inputs: withContributions ? sampleInputs : [],
            notes: [],
            ...(withContributions ? { modifiers: sampleModifiers } : {}),
            ...(scoreType ? { score_type: scoreType } : {}),
          },
        },
      },
    });

  const getHistory = async (
    query: Record<string, string | number | boolean>,
    expectStatusCode: number = 200
  ) => {
    const response = await supertest
      .get(RISK_SCORE_HISTORY_URL)
      .query(query)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send();
    expect(response.status).to.eql(expectStatusCode, JSON.stringify(response.body));
    return response.body;
  };

  describe('@ess @serverless @skipInServerlessMKI Risk Score History API', () => {
    before(async () => {
      await riskEngineRoutes.init();
      await seedRiskScoreDoc({
        timestamp: '2026-01-01T00:00:00.000Z',
        scoreNorm: 21,
        level: 'Low',
      });
      await seedRiskScoreDoc({
        timestamp: '2026-01-02T00:00:00.000Z',
        scoreNorm: 45,
        level: 'Moderate',
        scoreType: 'base',
        withContributions: true,
      });
      await seedRiskScoreDoc({
        timestamp: '2026-01-03T00:00:00.000Z',
        scoreNorm: 60,
        level: 'Moderate',
        scoreType: 'propagated',
      });
      await seedRiskScoreDoc({
        timestamp: '2026-01-02T12:00:00.000Z',
        scoreNorm: 99,
        level: 'Critical',
        entityId: 'another-entity-id',
      });
      // Two runs inside the same hour: the lower-scoring run first, the higher one
      // later, so a naive "first/last per bucket" would pick the wrong document.
      await seedRiskScoreDoc({
        timestamp: '2026-02-01T00:10:00.000Z',
        scoreNorm: 30,
        level: 'Low',
        entityId: BUCKET_ENTITY_ID,
      });
      await seedRiskScoreDoc({
        timestamp: '2026-02-01T00:40:00.000Z',
        scoreNorm: 80,
        level: 'High',
        entityId: BUCKET_ENTITY_ID,
      });
    });

    after(async () => {
      await deleteAllRiskScores(log, es);
      await riskEngineRoutes.cleanUp();
    });

    it('returns time-ordered entries for the requested entity only', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-04T00:00:00.000Z',
      });

      expect(body.entity_id).to.eql(ENTITY_ID);
      expect(body.entity_type).to.eql('host');
      // 3-day range → hourly buckets; each seeded run lands in its own bucket
      expect(body.interval).to.eql('1h');
      expect(body.entries.map((entry: { '@timestamp': string }) => entry['@timestamp'])).to.eql([
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-01-03T00:00:00.000Z',
      ]);
    });

    it('returns the max-scoring document (with its exact original @timestamp) per bucket', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: BUCKET_ENTITY_ID,
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-02-01T01:00:00.000Z',
      });

      // Both runs fall in the single 1h bucket; the response collapses to the
      // highest-scoring run while preserving that run's real @timestamp.
      expect(body.interval).to.eql('1h');
      expect(body.entries.length).to.eql(1);
      expect(body.entries[0]['@timestamp']).to.eql('2026-02-01T00:40:00.000Z');
      expect(body.entries[0].calculated_score_norm).to.eql(80);
      expect(body.entries[0].calculated_level).to.eql('High');
    });

    it('returns the effective interval derived from a wide range', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: 'now-90d',
        to: 'now',
      });

      // 90-day range at the default barTarget → daily buckets
      expect(body.interval).to.eql('1d');
    });

    it('uses a calendar-unit interval for a multi-year range', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: 'now-2y',
        to: 'now',
      });

      // A 2-year range at the default barTarget lands on a calendar unit
      // (week/month/year); don't over-pin the exact bucket size here.
      expect(body.interval).to.match(/^1(w|M|y)$/);
      expect(body.entries).to.be.an('array');
      const timestamps = body.entries.map((entry: { '@timestamp': string }) => entry['@timestamp']);
      expect(timestamps).to.eql([...timestamps].sort());
    });

    it('does not include contributions by default', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-04T00:00:00.000Z',
      });

      body.entries.forEach((entry: Record<string, unknown>) => {
        expect(entry).to.not.have.property('inputs');
        expect(entry).to.not.have.property('modifiers');
      });
    });

    it('includes contributions when include_contributions=true', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: '2026-01-02T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        include_contributions: true,
      });

      expect(body.entries.length).to.eql(1);
      expect(body.entries[0].inputs).to.eql(sampleInputs);
      expect(body.entries[0].modifiers).to.eql(sampleModifiers);
    });

    it('omits contribution fields absent on the document even when requested', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
        include_contributions: true,
      });

      expect(body.entries.length).to.eql(1);
      expect(body.entries[0].inputs).to.eql([]);
      expect(body.entries[0]).to.not.have.property('modifiers');
    });

    it('filters by score_type treating missing score_type as base', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-04T00:00:00.000Z',
        score_type: 'base',
      });

      expect(body.entries.map((entry: { '@timestamp': string }) => entry['@timestamp'])).to.eql([
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
      ]);
    });

    it('filters by the requested time range', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: ENTITY_ID,
        from: '2026-01-02T00:00:00.000Z',
        to: '2026-01-04T00:00:00.000Z',
      });

      expect(body.entries.map((entry: { '@timestamp': string }) => entry['@timestamp'])).to.eql([
        '2026-01-02T00:00:00.000Z',
        '2026-01-03T00:00:00.000Z',
      ]);
    });

    it('returns an empty list for an unknown entity', async () => {
      const body = await getHistory({
        entity_type: 'host',
        entity_id: 'no-such-entity',
      });

      expect(body.entries).to.eql([]);
    });

    it('rejects an invalid entity_type', async () => {
      await getHistory({ entity_type: 'invalid', entity_id: ENTITY_ID }, 400);
    });
  });
};
