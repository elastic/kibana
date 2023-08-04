/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RISK_ENGINE_INIT_URL } from '@kbn/security-solution-plugin/common/constants';
// import type { RiskScore } from '@kbn/security-solution-plugin/server/lib/risk_engine/types';
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

  const initializeRiskEngine = async () =>
    await supertest.post(RISK_ENGINE_INIT_URL).set('kbn-xsrf', 'true').send().expect(200);

  // const calculateRiskScoreAfterRuleCreationAndExecution = async (
  //   documentId: string,
  //   {
  //     alerts = 1,
  //     riskScore = 21,
  //     maxSignals = 100,
  //   }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  // ) => {
  //   await createAndSyncRuleAndAlerts({ query: `id: ${documentId}`, alerts, riskScore, maxSignals });

  //   return await calculateRiskScores({
  //     body: {
  //       data_view_id: '.alerts-security.alerts-default',
  //       range: { start: 'now-30d', end: 'now' },
  //       identifier_type: 'host',
  //     },
  //   });
  // };

  describe('Risk Engine Scoring - Task', () => {
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

      describe('with some alerts', () => {
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

        describe('initializing the risk engine', () => {
          beforeEach(async () => {
            await initializeRiskEngine();
          });

          it('calculates and persists risk scores for alert documents', async () => {
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });

            const scores = await readRiskScores(es);
            expect(scores).to.eql([]);
          });
        });
      });
    });
  });
};
