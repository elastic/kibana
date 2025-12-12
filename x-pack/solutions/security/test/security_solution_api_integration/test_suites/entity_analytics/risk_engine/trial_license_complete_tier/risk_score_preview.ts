/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { RISK_SCORE_PREVIEW_URL } from '@kbn/security-solution-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import {
  createAlertsIndex,
  deleteAllAlerts,
  deleteAllRules,
} from '@kbn/detections-response-ftr-services';
import { dataGeneratorFactory } from '../../../detections_response/utils';
import {
  assetCriticalityRouteHelpersFactory,
  buildDocument,
  cleanAssetCriticality,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  sanitizeScores,
  waitForAssetCriticalityToBePresent,
} from '../../utils';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const previewRiskScores = async ({
    body,
  }: {
    body: object;
  }): Promise<{
    scores: { host?: EntityRiskScoreRecord[]; user?: EntityRiskScoreRecord[] };
  }> => {
    const defaultBody = { data_view_id: '.alerts-security.alerts-default' };
    const { body: result } = await supertest
      .post(RISK_SCORE_PREVIEW_URL)
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'true')
      .send({ ...defaultBody, ...body })
      .expect(200);
    return result;
  };

  const getRiskScoreAfterRuleCreationAndExecution = async (
    documentId: string,
    {
      alerts = 1,
      riskScore = 21,
      maxSignals = 100,
    }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  ) => {
    await createAndSyncRuleAndAlerts({ query: `id: ${documentId}`, alerts, riskScore, maxSignals });

    return await previewRiskScores({ body: {} });
  };

  describe('@ess @serverless Risk Scoring Preview API', () => {
    context('with auditbeat data', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);

        await deleteAllRules(supertest, log);
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllRiskScores(log, es);
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      context('with a rule generating alerts with risk_score of 21', () => {
        it('calculates risk from a single alert', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId);
          const [score] = sanitizeScores(body.scores.host!);
          const [rawScore] = body.scores.host!;

          expect(score).to.eql({
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 8.100601759,
            category_1_count: 1,
            category_1_score: 8.100601759,
            id_field: 'host.name',
            id_value: 'host-1',
          });

          expect(rawScore.category_1_score! + rawScore.category_2_score!).to.be.within(
            score.calculated_score_norm! - 0.000000000000001,
            score.calculated_score_norm! + 0.000000000000001
          );
        });

        it('calculates risk from two alerts, each representing a unique host', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          const sortedScores = sanitizeScores(body.scores.host!).sort((a, b) =>
            String(a.id_value).localeCompare(String(b.id_value))
          );

          expect(sortedScores).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.100601759,
              category_1_count: 1,
              category_1_score: 8.100601759,
              id_field: 'host.name',
              id_value: 'host-1',
            },
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.100601759,
              category_1_count: 1,
              category_1_score: 8.100601759,
              id_field: 'host.name',
              id_value: 'host-2',
            },
          ]);
        });

        it('calculates risk from two alerts, both for the same host', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-1' } }, documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 28.4246212025,
              calculated_score_norm: 10.9645969767,
              category_1_count: 2,
              category_1_score: 10.9645969767,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });

        it('calculates risk from 30 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(30).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 30,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 47.2551350606,
              calculated_score_norm: 18.2283347711,
              category_1_count: 30,
              category_1_score: 18.2283347711,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });

        it('calculates risk from 31 alerts, 30 from the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments([
            ...Array(30).fill(doc),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 31,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 47.2551350606,
              calculated_score_norm: 18.2283347711,
              category_1_count: 30,
              category_1_score: 18.2283347711,
              id_field: 'host.name',
              id_value: 'host-1',
            },
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.100601759,
              category_1_count: 1,
              category_1_score: 8.100601759,
              id_field: 'host.name',
              id_value: 'host-2',
            },
          ]);
        });

        it('calculates risk from 100 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 100,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 50.6703560728,
              calculated_score_norm: 19.5457321682,
              category_1_count: 100,
              category_1_score: 19.5457321682,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });

        it('calculates risk from 5 alerts, all in closed state, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument(
            { host: { name: 'host-1' }, kibana: { alert: { workflow_status: 'closed' } } },
            documentId
          );
          await indexListOfDocuments(Array(10).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 5,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 41.9020663603,
              calculated_score_norm: 16.1634263078,
              category_1_count: 10,
              category_1_score: 16.1634263078,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });
        it('calculates risk from 10 alerts, some in closed state, some in open state, all for the same host', async () => {
          const documentId = uuidv4();
          const docStatusClosed = buildDocument(
            { host: { name: 'host-1' }, kibana: { alert: { workflow_status: 'closed' } } },
            documentId
          );
          const docStatusOpen = buildDocument(
            { host: { name: 'host-1' }, kibana: { alert: { workflow_status: 'open' } } },
            documentId
          );
          await indexListOfDocuments(Array(5).fill(docStatusClosed));
          await indexListOfDocuments(Array(5).fill(docStatusOpen));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 10,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 41.9020663603,
              calculated_score_norm: 16.1634263078,
              category_1_count: 10,
              category_1_score: 16.1634263078,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });
      });

      context('with a rule generating alerts with risk_score of 100', () => {
        it('calculates risk from 100 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            riskScore: 100,
            alerts: 100,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Critical',
              calculated_score: 241.2874098704,
              calculated_score_norm: 93.0749150865,
              category_1_count: 100,
              category_1_score: 93.0749150865,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });

        it('calculates risk from 1,000 alerts, all for the same host', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(1000)
              .fill(doc)
              .map((item, index) => ({
                ...item,
                ['@timestamp']: item['@timestamp'] - index,
              }))
          );

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            riskScore: 100,
            alerts: 1000,
            maxSignals: 1000,
          });

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Critical',
              calculated_score: 254.9145602918,
              calculated_score_norm: 98.3314921662,
              category_1_count: 1000,
              category_1_score: 98.3314921662,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });
      });

      describe('risk score pagination', () => {
        it('respects the specified after_keys', async () => {
          const aaaId = uuidv4();
          const zzzId = uuidv4();
          const aaaDoc = buildDocument({ 'user.name': 'aaa' }, aaaId);
          const zzzDoc = buildDocument({ 'user.name': 'zzz' }, zzzId);
          await indexListOfDocuments(Array(50).fill(aaaDoc).concat(Array(50).fill(zzzDoc)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${aaaId} OR ${zzzId}`,
            alerts: 100,
            riskScore: 100,
          });

          const { scores } = await previewRiskScores({
            body: {
              after_keys: { user: { 'user.name': 'aaa' } },
            },
          });
          // if after_key was not respected, 'aaa' would be included here
          expect(scores.user).to.have.length(1);
          expect(scores.user?.[0].id_value).to.equal('zzz');
        });
      });

      describe('risk score filtering', () => {
        it('restricts the range of risk inputs used for scoring', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(100)
              .fill(doc)
              .map((_doc, i) => ({ ...doc, 'event.risk_score': i === 99 ? 1 : 100 }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
            riskScoreOverride: 'event.risk_score',
          });
          const { scores } = await previewRiskScores({
            body: {
              filter: {
                bool: {
                  filter: [
                    {
                      range: {
                        [ALERT_RISK_SCORE]: {
                          lte: 1,
                        },
                      },
                    },
                  ],
                },
              },
            },
          });

          expect(scores.host).to.have.length(1);
          expect(scores.host?.[0].inputs).to.have.length(1);
        });
      });

      describe('risk score ordering', () => {
        it('aggregates multiple scores such that the highest-risk scores contribute the majority of the score', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(100)
              .fill(doc)
              .map((_doc, i) => ({ ...doc, 'event.risk_score': 100 - i }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
            riskScoreOverride: 'event.risk_score',
          });
          const { scores } = await previewRiskScores({ body: {} });

          expect(sanitizeScores(scores.host!)).to.eql([
            {
              calculated_level: 'High',
              calculated_score: 225.1106801443,
              calculated_score_norm: 86.8348557878,
              category_1_count: 100,
              category_1_score: 86.8348557878,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });
      });

      context('with global risk weights', () => {
        it('weights host scores differently when host risk weight is configured', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
          });
          const { scores } = await previewRiskScores({
            body: { weights: [{ type: 'global_identifier', host: 0.5 }] },
          });

          expect(sanitizeScores(scores.host!)).to.eql([
            {
              calculated_level: 'Moderate',
              calculated_score: 120.6437049352,
              calculated_score_norm: 46.5374575433,
              category_1_count: 100,
              category_1_score: 93.0749150865,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
        });

        it('weights user scores differently if user risk weight is configured', async () => {
          const documentId = uuidv4();
          const doc = buildDocument({ user: { name: 'user-1' } }, documentId);
          await indexListOfDocuments(Array(100).fill(doc));

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
          });
          const { scores } = await previewRiskScores({
            body: { weights: [{ type: 'global_identifier', user: 0.7 }] },
          });

          expect(sanitizeScores(scores.user!)).to.eql([
            {
              calculated_level: 'Moderate',
              calculated_score: 168.9011869093,
              calculated_score_norm: 65.1524405606,
              category_1_count: 100,
              category_1_score: 93.0749150865,
              id_field: 'user.name',
              id_value: 'user-1',
            },
          ]);
        });

        it('weights entity scores differently when host and user risk weights are configured', async () => {
          const usersId = uuidv4();
          const hostsId = uuidv4();
          const userDocs = buildDocument({ 'user.name': 'user-1' }, usersId);
          const hostDocs = buildDocument({ 'host.name': 'host-1' }, usersId);
          await indexListOfDocuments(Array(50).fill(userDocs).concat(Array(50).fill(hostDocs)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${hostsId} OR ${usersId}`,
            alerts: 100,
            riskScore: 100,
          });
          const { scores } = await previewRiskScores({
            body: { weights: [{ type: 'global_identifier', host: 0.4, user: 0.8 }] },
          });

          expect(sanitizeScores(scores.host!)).to.eql([
            {
              calculated_level: 'Low',
              calculated_score: 93.2375911647,
              calculated_score_norm: 35.9657426187,
              category_1_count: 50,
              category_1_score: 89.9143565467,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);

          expect(sanitizeScores(scores.user!)).to.eql([
            {
              calculated_level: 'High',
              calculated_score: 186.4751823294,
              calculated_score_norm: 71.9314852374,
              category_1_count: 50,
              category_1_score: 89.9143565467,
              id_field: 'user.name',
              id_value: 'user-1',
            },
          ]);
        });
      });

      describe('@skipInServerless with asset criticality data', () => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

        beforeEach(async () => {
          await assetCriticalityRoutes.upsert({
            id_field: 'host.name',
            id_value: 'host-1',
            criticality_level: 'extreme_impact',
          });
        });

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
        });

        it('calculates and persists risk scores with additional criticality metadata and modifiers', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([
            buildDocument({ host: { name: 'host-1' } }, documentId),
            buildDocument({ host: { name: 'host-2' } }, documentId),
          ]);
          await waitForAssetCriticalityToBePresent({ es, log });

          const body = await getRiskScoreAfterRuleCreationAndExecution(documentId, {
            alerts: 2,
          });

          const sortedScores = sanitizeScores(body.scores.host!).sort((a, b) =>
            String(a.id_value).localeCompare(String(b.id_value))
          );

          expect(sortedScores).to.eql([
            {
              criticality_level: 'extreme_impact',
              criticality_modifier: 2.0,
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 14.9871538681,
              category_1_count: 1,
              category_1_score: 8.100601759,
              id_field: 'host.name',
              id_value: 'host-1',
            },
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.100601759,
              category_1_count: 1,
              category_1_score: 8.100601759,
              id_field: 'host.name',
              id_value: 'host-2',
            },
          ]);
        });
      });
    });

    it('does not return an 404 when the data_view_id is an non existent index', async () => {
      const { scores } = await previewRiskScores({
        body: { data_view_id: 'invalid-index' },
      });

      expect(scores).to.eql({
        host: [],
        service: [],
        user: [],
      });
    });
  });
};
