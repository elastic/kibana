/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { deleteAllAlerts, deleteAllRules } from '../../../../../common/utils/security_solution';
import {
  buildDocument,
  clearLegacyDashboards,
  clearLegacyTransforms,
  createAndSyncRuleAndAlertsFactory,
  riskEngineRouteHelpersFactory,
  waitForRiskEngineRun,
  waitForRiskScoresToBePresent,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataGeneratorFactory } from '../../../detections_response/utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const log = getService('log');

  const cleanAllResources = async () => {
    await clearLegacyTransforms({ es, log });
    await clearLegacyDashboards({ supertest, log });
    await deleteAllAlerts(supertest, log, es);
    await deleteAllRules(supertest, log);
    await riskEngineRoutes.cleanUp();
  };

  describe('@ess @serverless @serverlessQA Risk Engine schedule_now', () => {
    const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
    const { indexListOfDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

    before(async () => {
      await cleanAllResources();
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    afterEach(async () => {
      await cleanAllResources();
    });

    it('should run the risk engine when "scheduleNow" is called', async () => {
      // create a document
      const firstDocumentId = uuidv4();
      await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, firstDocumentId)]);
      await createAndSyncRuleAndAlerts({ query: `id: ${firstDocumentId}` });

      // first risk engine run
      await riskEngineRoutes.init();
      await waitForRiskEngineRun({ log, supertest });
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

      // second risk engine run
      await riskEngineRoutes.scheduleNow();
      await waitForRiskEngineRun({ log, supertest });
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 }); // Should calculate risk score again for the same document
    });
  });
};
