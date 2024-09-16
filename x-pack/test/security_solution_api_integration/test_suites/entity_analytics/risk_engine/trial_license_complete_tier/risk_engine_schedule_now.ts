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
  cleanRiskEngine,
  clearLegacyDashboards,
  clearLegacyTransforms,
  createAndSyncRuleAndAlertsFactory,
  riskEngineRouteHelpersFactory,
  waitForRiskScoresToBePresent,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataGeneratorFactory } from '../../../detections_response/utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const log = getService('log');

  describe('@ess @serverless @serverlessQA init_and_status_apis', () => {
    const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
    const { indexListOfDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    afterEach(async () => {
      await cleanRiskEngine({ kibanaServer, es, log });
      await clearLegacyTransforms({ es, log });
      await clearLegacyDashboards({ supertest, log });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('should run the risk engine when "scheduleNow" is called', async () => {
      const firstDocumentId = uuidv4();
      await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, firstDocumentId)]);
      await createAndSyncRuleAndAlerts({ query: `id: ${firstDocumentId}` });

      await riskEngineRoutes.init();
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

      const secondDocumentId = uuidv4();
      await indexListOfDocuments([buildDocument({ host: { name: 'host-2' } }, secondDocumentId)]);
      await createAndSyncRuleAndAlerts({
        query: `id: ${secondDocumentId}`,
      });

      await riskEngineRoutes.scheduleNow();

      // Should index 2 more document on the second run
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 3 });
    });
  });
};
