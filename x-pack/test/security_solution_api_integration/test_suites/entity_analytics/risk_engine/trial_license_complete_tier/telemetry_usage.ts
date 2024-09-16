/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { dataGeneratorFactory } from '../../../detections_response/utils';
import { deleteAllRules, deleteAllAlerts } from '../../../../../common/utils/security_solution';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  waitForRiskScoresToBePresent,
  riskEngineRouteHelpersFactory,
  cleanRiskEngine,
  getRiskEngineStats,
  areRiskScoreIndicesEmpty,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');
  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  describe('@ess @serverless telemetry', () => {
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
      await cleanRiskEngine({ kibanaServer, es, log });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    beforeEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('should return empty metrics when the risk engine is disabled', async () => {
      await retry.try(async () => {
        const stats = await getRiskEngineStats(supertest, log);
        expect(stats).to.eql({});
      });
    });

    // https://github.com/elastic/kibana/issues/183246
    it('@skipInServerlessMKI should return metrics with expected values when risk engine is enabled', async () => {
      expect(await areRiskScoreIndicesEmpty({ log, es })).to.be(true);

      const hostId = uuidv4();
      const hostDocs = Array(10)
        .fill(buildDocument({}, hostId))
        .map((event, index) => ({
          ...event,
          'host.name': `host-${index}`,
        }));

      const userId = uuidv4();
      const userDocs = Array(10)
        .fill(buildDocument({}, userId))
        .map((event, index) => ({
          ...event,
          'user.name': `user-${index}`,
        }));

      await indexListOfDocuments([...hostDocs, ...userDocs]);

      await createAndSyncRuleAndAlerts({
        query: `id: ${userId} or id: ${hostId}`,
        alerts: 20,
        riskScore: 40,
      });

      await riskEngineRoutes.init();

      await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });

      await retry.try(async () => {
        const {
          all_risk_scores_index_size: allRiskScoreIndexSize,
          unique_risk_scores_index_size: uniqueRiskScoreIndexSize,
          ...otherStats
        } = await getRiskEngineStats(supertest, log);
        const expected = {
          unique_host_risk_score_total: 10,
          unique_user_risk_score_total: 10,
          unique_user_risk_score_day: 10,
          unique_host_risk_score_day: 10,
          all_user_risk_scores_total: 10,
          all_host_risk_scores_total: 10,
          all_user_risk_scores_total_day: 10,
          all_host_risk_scores_total_day: 10,
        };
        expect(otherStats).to.eql(expected);
      });
    });
  });
};
