/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RISK_SCORE_CALCULATION_URL } from '@kbn/security-solution-plugin/common/constants';
import type { RiskScore } from '@kbn/security-solution-plugin/common/risk_engine';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { deleteAllAlerts, deleteAllRules } from '../../../utils';
import { dataGeneratorFactory } from '../../../utils/data_generator';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  readRiskScores,
  normalizeScores,
  waitForRiskScoresToBePresent,
} from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });

  const calculateRiskScores = async ({
    body,
  }: {
    body: object;
  }): Promise<{ scores: RiskScore[] }> => {
    const { body: result } = await supertest
      .post(RISK_SCORE_CALCULATION_URL)
      .set('kbn-xsrf', 'true')
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

  describe('Risk Engine Scoring - Calculation', () => {
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
      });

      afterEach(async () => {
        await deleteAllRiskScores(log, es);
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
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

        await waitForRiskScoresToBePresent(es, log);
        const scores = await readRiskScores(es);

        expect(scores.length).to.eql(1);
        expect(normalizeScores(scores)).to.eql([
          {
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 8.039816232771823,
            category_1_score: 21,
            category_1_count: 1,
            id_field: 'host.name',
            id_value: 'host-1',
          },
        ]);
      });

      // FLAKY: https://github.com/elastic/kibana/issues/162736
      describe.skip('paging through calculationss', () => {
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

          await waitForRiskScoresToBePresent(es, log);
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

          await waitForRiskScoresToBePresent(es, log);
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

          await waitForRiskScoresToBePresent(es, log);
          const scores = await readRiskScores(es);

          expect(scores.length).to.eql(10);
        });
      });
    });
  });
};
