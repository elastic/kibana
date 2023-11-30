/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import {
  deleteAllAlerts,
  deleteAllRules,
  dataGeneratorFactory,
} from '../../../../detections_response/utils';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  riskEngineRouteHelpersFactory,
  updateRiskEngineConfigSO,
  getRiskEngineTask,
  waitForRiskEngineTaskToBeGone,
  cleanRiskEngine,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  describe('@ess @serverless Risk Scoring Task Execution', () => {
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
        await cleanRiskEngine({ kibanaServer, es, log });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      afterEach(async () => {
        await cleanRiskEngine({ kibanaServer, es, log });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      describe('with some alerts containing hosts', () => {
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
            await riskEngineRoutes.init();
          });

          it('@skipInQA calculates and persists risk scores for alert documents', async () => {
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });

            const scores = await readRiskScores(es);
            expect(normalizeScores(scores).map(({ id_value: idValue }) => idValue)).to.eql(
              Array(10)
                .fill(0)
                .map((_, index) => `host-${index}`)
            );
          });

          it('@skipInQA starts the latest transform', async () => {
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });

            const transformStats = await es.transform.getTransformStats({
              transform_id: 'risk_score_latest_transform_default',
            });

            expect(transformStats.transforms[0].state).to.eql('started');
          });

          describe('@skipInQA disabling and re-enabling the risk engine', () => {
            beforeEach(async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
              await riskEngineRoutes.disable();
              await riskEngineRoutes.enable();
            });

            it('calculates another round of scores', async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });

              const scores = await readRiskScores(es);
              const expectedHostNames = Array(10)
                .fill(0)
                .map((_, index) => `host-${index}`);
              const actualHostNames = normalizeScores(scores).map(
                ({ id_value: idValue }) => idValue
              );

              expect(actualHostNames).to.eql([...expectedHostNames, ...expectedHostNames]);
            });
          });

          describe('@skipInQA disabling the risk engine', () => {
            beforeEach(async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
            });

            it('removes the risk scoring task', async () => {
              const task = await getRiskEngineTask({ es });
              expect(task).not.to.be(undefined);
              await riskEngineRoutes.disable();
              await waitForRiskEngineTaskToBeGone({ es, log });
              const disabledTask = await getRiskEngineTask({ es });

              expect(disabledTask).to.eql(undefined);
            });
          });

          describe('modifying configuration', () => {
            beforeEach(async () => {
              await riskEngineRoutes.disable();
            });

            describe('when task interval is modified', () => {
              beforeEach(async () => {
                await updateRiskEngineConfigSO({
                  attributes: {
                    interval: '1s',
                  },
                  kibanaServer,
                });
                await riskEngineRoutes.enable();
              });

              it('executes multiple times', async () => {
                await waitForRiskScoresToBePresent({ es, log, scoreCount: 30 });
                const riskScores = await readRiskScores(es);

                expect(riskScores.length).to.be.greaterThan(29);
              });
            });
          });
        });
      });

      // FLAKY: https://github.com/elastic/kibana/issues/171132
      describe.skip('with some alerts containing hosts and others containing users', () => {
        let hostId: string;
        let userId: string;

        beforeEach(async () => {
          hostId = uuidv4();
          const hostEvent = buildDocument({ host: { name: 'host-1' } }, hostId);
          await indexListOfDocuments(
            Array(10)
              .fill(hostEvent)
              .map((event, index) => ({
                ...event,
                'host.name': `host-${index}`,
              }))
          );

          userId = uuidv4();
          const userEvent = buildDocument({ user: { name: 'user-1' } }, userId);
          await indexListOfDocuments(
            Array(10)
              .fill(userEvent)
              .map((event, index) => ({
                ...event,
                'user.name': `user-${index}`,
              }))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${userId} or id: ${hostId}`,
            alerts: 20,
            riskScore: 40,
          });

          await riskEngineRoutes.init();
        });

        it('@skipInQA calculates and persists risk scores for both types of entities', async () => {
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });
          const riskScores = await readRiskScores(es);

          expect(riskScores.length).to.eql(20);
          const scoredIdentifiers = normalizeScores(riskScores).map(
            ({ id_field: idField }) => idField
          );
          expect(scoredIdentifiers.includes('host.name')).to.be(true);
          expect(scoredIdentifiers.includes('user.name')).to.be(true);
        });
      });
    });
  });
};
