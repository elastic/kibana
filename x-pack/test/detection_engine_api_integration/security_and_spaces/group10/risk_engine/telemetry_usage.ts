/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { deleteAllRules, deleteAllAlerts, getRiskEngineStats } from '../../../utils';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  deleteRiskEngineTask,
  deleteRiskScoreIndices,
  waitForRiskScoresToBePresent,
  riskEngineRouteHelpersFactory,
  cleanRiskEngineConfig,
  clearTransforms,
} from './utils';
import { dataGeneratorFactory } from '../../../utils/data_generator';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  describe('Risk engine telemetry', async () => {
    const { indexListOfDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    beforeEach(async () => {
      await cleanRiskEngineConfig({ kibanaServer });
      await deleteRiskEngineTask({ es, log });
      await deleteRiskScoreIndices({ log, es });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await clearTransforms({ es, log });
    });

    describe('Risk engine not enabled', () => {
      it('should has empty riskEngineMetrics', async () => {
        await retry.try(async () => {
          const stats = await getRiskEngineStats(supertest, log);
          const expected = {};
          expect(stats).to.eql(expected);
        });
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/168429
    describe('Risk engine enabled', () => {
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

      afterEach(async () => {
        await cleanRiskEngineConfig({ kibanaServer });
        await deleteRiskEngineTask({ es, log });
        await deleteRiskScoreIndices({ log, es });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await clearTransforms({ es, log });
      });

      it('should return riskEngineMetrics with expected values', async () => {
        await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });
        await retry.try(async () => {
          const {
            all_risk_scores_index_size: allRiskScoreIndexSize,
            unique_risk_scores_index_size: uniqueRiskScoreIndexSize,
            ...otherStats
          } = await getRiskEngineStats(supertest, log);
          const expected = {
            unique_host_risk_score_total: 0,
            unique_user_risk_score_total: 0,
            unique_user_risk_score_day: 0,
            unique_host_risk_score_day: 0,
            all_user_risk_scores_total: 10,
            all_host_risk_scores_total: 10,
            all_user_risk_scores_total_day: 10,
            all_host_risk_scores_total_day: 10,
          };
          expect(otherStats).to.eql(expected);
          expect(allRiskScoreIndexSize).to.be.greaterThan(0);
          expect(uniqueRiskScoreIndexSize).to.be.greaterThan(0);
        });
      });
    });
  });
};
