/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { RISK_SCORE_PREVIEW_URL } from '@kbn/security-solution-plugin/common/constants';
import type { RiskScore } from '@kbn/security-solution-plugin/common/risk_engine';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createSignalsIndex, deleteAllAlerts, deleteAllRules } from '../../../utils';
import { dataGeneratorFactory } from '../../../utils/data_generator';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  sanitizeScores,
} from './utils';

// eslint-disable-next-line import/no-default-export
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
  }): Promise<{ scores: { host?: RiskScore[]; user?: RiskScore[] } }> => {
    const defaultBody = { data_view_id: '.alerts-security.alerts-default' };
    const { body: result } = await supertest
      .post(RISK_SCORE_PREVIEW_URL)
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

  describe('Risk Engine Scoring - Preview', () => {
    context('with auditbeat data', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);

        await deleteAllRules(supertest, log);
        await createSignalsIndex(supertest, log);
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

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.039816232771823,
              category_1_count: 1,
              category_1_score: 21,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);
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

          expect(sanitizeScores(body.scores.host!)).to.eql([
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.039816232771823,
              category_1_count: 1,
              category_1_score: 21,
              id_field: 'host.name',
              id_value: 'host-1',
            },
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.039816232771823,
              category_1_count: 1,
              category_1_score: 21,
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
              calculated_score: 28.42462120245875,
              calculated_score_norm: 10.88232052161514,
              category_1_count: 2,
              category_1_score: 28,
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
              calculated_score: 47.25513506055279,
              calculated_score_norm: 18.091552473412246,
              category_1_count: 30,
              category_1_score: 37,
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
              calculated_score: 47.25513506055279,
              calculated_score_norm: 18.091552473412246,
              category_1_count: 30,
              category_1_score: 37,
              id_field: 'host.name',
              id_value: 'host-1',
            },
            {
              calculated_level: 'Unknown',
              calculated_score: 21,
              calculated_score_norm: 8.039816232771823,
              category_1_count: 1,
              category_1_score: 21,
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
              calculated_score: 50.67035607277805,
              calculated_score_norm: 19.399064346392823,
              category_1_count: 100,
              category_1_score: 37,
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
              calculated_score: 241.2874098703716,
              calculated_score_norm: 92.37649688758484,
              category_1_count: 100,
              category_1_score: 209,
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
              calculated_score: 254.91456029175757,
              calculated_score_norm: 97.59362951445543,
              category_1_count: 1000,
              category_1_score: 209,
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
              calculated_score: 225.1106801442913,
              calculated_score_norm: 86.18326192354185,
              category_1_count: 100,
              category_1_score: 203,
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
              calculated_score: 120.6437049351858,
              calculated_score_norm: 46.18824844379242,
              category_1_count: 100,
              category_1_score: 209,
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
              calculated_score: 168.9011869092601,
              calculated_score_norm: 64.66354782130938,
              category_1_count: 100,
              category_1_score: 209,
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
              calculated_score: 93.23759116471251,
              calculated_score_norm: 35.695861854790394,
              category_1_count: 50,
              category_1_score: 209,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);

          expect(sanitizeScores(scores.user!)).to.eql([
            {
              calculated_level: 'High',
              calculated_score: 186.47518232942502,
              calculated_score_norm: 71.39172370958079,
              category_1_count: 50,
              category_1_score: 209,
              id_field: 'user.name',
              id_value: 'user-1',
            },
          ]);
        });
      });

      context('with category weights', () => {
        it('weights risk inputs from different categories according to the category weight', async () => {
          const documentId = uuidv4();
          const userSignal = buildDocument(
            { 'event.kind': 'signal', 'user.name': 'user-1' },
            documentId
          );
          const hostSignal = buildDocument(
            { 'event.kind': 'signal', 'host.name': 'host-1' },
            documentId
          );
          await indexListOfDocuments(Array(50).fill(userSignal).concat(Array(50).fill(hostSignal)));

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 100,
            riskScore: 100,
          });
          const { scores } = await previewRiskScores({
            body: {
              weights: [{ type: 'risk_category', value: 'category_1', host: 0.4, user: 0.8 }],
            },
          });

          expect(sanitizeScores(scores.host!)).to.eql([
            {
              calculated_level: 'Low',
              calculated_score: 93.2375911647125,
              calculated_score_norm: 35.695861854790394,
              category_1_score: 77,
              category_1_count: 50,
              id_field: 'host.name',
              id_value: 'host-1',
            },
          ]);

          expect(sanitizeScores(scores.user!)).to.eql([
            {
              calculated_level: 'High',
              calculated_score: 186.475182329425,
              calculated_score_norm: 71.39172370958079,
              category_1_score: 165,
              category_1_count: 50,
              id_field: 'user.name',
              id_value: 'user-1',
            },
          ]);
        });
      });
    });
  });
};
