/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';

import { RISK_SCORE_CALCULATION_URL } from '@kbn/security-solution-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import { dataGeneratorFactory } from '../../../detections_response/utils';
import { deleteAllAlerts, deleteAllRules } from '../../../../../common/utils/security_solution';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  readRiskScores,
  normalizeScores,
  waitForRiskScoresToBePresent,
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  waitForAssetCriticalityToBePresent,
  getLatestRiskScoreIndexMapping,
  riskEngineRouteHelpersFactory,
  cleanRiskEngine,
  enableAssetCriticalityAdvancedSetting,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });

  const calculateRiskScores = async ({
    body,
  }: {
    body: object;
  }): Promise<{ scores: EntityRiskScoreRecord[] }> => {
    const { body: result } = await supertest
      .post(RISK_SCORE_CALCULATION_URL)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(body)
      .expect(200);
    return result;
  };

  const calculateRiskScoreAfterRuleCreationAndExecution = async (
    documentId: string,
    {
      alerts = 1,
      riskScore = 21,
      maxSignals = 100,
    }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  ) => {
    await createAndSyncRuleAndAlerts({ query: `id: ${documentId}`, alerts, riskScore, maxSignals });

    return await calculateRiskScores({
      body: {
        data_view_id: '.alerts-security.alerts-default',
        range: { start: 'now-30d', end: 'now' },
        identifier_type: 'host',
      },
    });
  };

  describe('@ess @serverless Risk Scoring Calculation API', () => {
    before(async () => {
      enableAssetCriticalityAdvancedSetting(kibanaServer, log);
    });

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

        await cleanRiskEngine({ kibanaServer, es, log });
        await riskEngineRoutes.init();
      });

      afterEach(async () => {
        await deleteAllRiskScores(log, es);
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);

        await cleanRiskEngine({ kibanaServer, es, log });
      });

      it('calculates and persists risk score', async () => {
        const documentId = uuidv4();
        await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);

        const results = await calculateRiskScoreAfterRuleCreationAndExecution(documentId);
        expect(results).to.eql({
          after_keys: {
            host: {
              'host.name': 'host-1',
            },
          },
          errors: [],
          scores_written: 1,
        });

        await waitForRiskScoresToBePresent({ es, log });
        const scores = await readRiskScores(es);

        expect(scores.length).to.eql(1);
        const [score] = normalizeScores(scores);

        expect(score).to.eql({
          calculated_level: 'Unknown',
          calculated_score: 21,
          calculated_score_norm: 8.10060175898781,
          category_1_score: 8.10060175898781,
          category_1_count: 1,
          id_field: 'host.name',
          id_value: 'host-1',
        });
      });

      it('upgrades latest risk score index dynamic setting before persisting risk scores', async () => {
        const documentId = uuidv4();
        await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);

        await calculateRiskScoreAfterRuleCreationAndExecution(documentId);

        const unmodifiedIndexMapping = await getLatestRiskScoreIndexMapping(es);
        // by default, the dynamic mapping is set to false.
        expect(unmodifiedIndexMapping?.dynamic).to.eql('false');

        // set the 'dynamic' configuration to an undesirable value
        await es.indices.putMapping({
          index: 'risk-score.risk-score-latest-default',
          dynamic: 'strict',
        });

        expect((await getLatestRiskScoreIndexMapping(es))?.dynamic).to.eql('strict');

        // before re-running risk score persistence, the dynamic configuration should be reset to the desired value
        await calculateRiskScoreAfterRuleCreationAndExecution(documentId);

        const finalIndexMapping = await getLatestRiskScoreIndexMapping(es);

        expect(finalIndexMapping?.dynamic).to.eql('false');

        // after all processing is complete, the mapping should be exactly the same as before
        expect(unmodifiedIndexMapping).to.eql(finalIndexMapping);
      });

      describe('paging through calculations', () => {
        let documentId: string;
        beforeEach(async () => {
          documentId = uuidv4();
          const baseEvent = buildDocument({ host: { name: 'host-1' } }, documentId);
          await indexListOfDocuments(
            Array(10)
              .fill(baseEvent)
              .map((_baseEvent, index) => ({
                ..._baseEvent,
                'host.name': `host-${index}`,
              }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 10,
            riskScore: 40,
          });
        });

        it('calculates and persists a single page of risk scores', async () => {
          const results = await calculateRiskScores({
            body: {
              data_view_id: '.alerts-security.alerts-default',
              identifier_type: 'host',
              range: { start: 'now-30d', end: 'now' },
            },
          });
          expect(results).to.eql({
            after_keys: {
              host: {
                'host.name': 'host-9',
              },
            },
            errors: [],
            scores_written: 10,
          });

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
          const scores = await readRiskScores(es);

          expect(scores.length).to.eql(10);
        });

        it('calculates and persists multiple pages of risk scores', async () => {
          const results = await calculateRiskScores({
            body: {
              data_view_id: '.alerts-security.alerts-default',
              identifier_type: 'host',
              range: { start: 'now-30d', end: 'now' },
              page_size: 5,
            },
          });
          expect(results).to.eql({
            after_keys: {
              host: {
                'host.name': 'host-4',
              },
            },
            errors: [],
            scores_written: 5,
          });

          const secondResults = await calculateRiskScores({
            body: {
              after_keys: {
                host: {
                  'host.name': 'host-4',
                },
              },
              data_view_id: '.alerts-security.alerts-default',
              identifier_type: 'host',
              range: { start: 'now-30d', end: 'now' },
              page_size: 5,
            },
          });

          expect(secondResults).to.eql({
            after_keys: {
              host: {
                'host.name': 'host-9',
              },
            },
            errors: [],
            scores_written: 5,
          });

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
          const scores = await readRiskScores(es);

          expect(scores.length).to.eql(10);
        });

        it('returns an appropriate response if there are no inputs left to score/persist', async () => {
          const results = await calculateRiskScores({
            body: {
              data_view_id: '.alerts-security.alerts-default',
              identifier_type: 'host',
              range: { start: 'now-30d', end: 'now' },
              page_size: 10,
            },
          });
          expect(results).to.eql({
            after_keys: {
              host: {
                'host.name': 'host-9',
              },
            },
            errors: [],
            scores_written: 10,
          });

          const noopCalculationResults = await calculateRiskScores({
            body: {
              after_keys: {
                host: {
                  'host.name': 'host-9',
                },
              },
              debug: true,
              data_view_id: '.alerts-security.alerts-default',
              identifier_type: 'host',
              range: { start: 'now-30d', end: 'now' },
              page_size: 5,
            },
          });

          expect(noopCalculationResults).to.eql({
            after_keys: {},
            errors: [],
            scores_written: 0,
          });

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
          const scores = await readRiskScores(es);

          expect(scores.length).to.eql(10);
        });
      });

      describe('@skipInServerless with asset criticality data', () => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

        beforeEach(async () => {
          await assetCriticalityRoutes.upsert({
            id_field: 'host.name',
            id_value: 'host-1',
            criticality_level: 'high_impact',
          });
        });

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
        });

        it('calculates and persists risk scores with additional criticality metadata and modifiers', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);
          await waitForAssetCriticalityToBePresent({ es, log });

          const results = await calculateRiskScoreAfterRuleCreationAndExecution(documentId);
          expect(results).to.eql({
            after_keys: { host: { 'host.name': 'host-1' } },
            errors: [],
            scores_written: 1,
          });

          await waitForRiskScoresToBePresent({ es, log });
          const scores = await readRiskScores(es);
          expect(scores.length).to.eql(1);

          const [score] = normalizeScores(scores);
          expect(score).to.eql({
            criticality_level: 'high_impact',
            criticality_modifier: 1.5,
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 11.677912063468526,
            category_1_score: 8.10060175898781,
            category_1_count: 1,
            id_field: 'host.name',
            id_value: 'host-1',
          });
          const [rawScore] = scores;

          expect(
            rawScore.host?.risk.category_1_score! + rawScore.host?.risk.category_2_score!
          ).to.be.within(
            score.calculated_score_norm! - 0.000000000000001,
            score.calculated_score_norm! + 0.000000000000001
          );
        });
      });
    });
  });
};
