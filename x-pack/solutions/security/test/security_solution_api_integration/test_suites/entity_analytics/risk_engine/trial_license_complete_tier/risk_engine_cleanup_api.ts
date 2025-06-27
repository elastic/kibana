/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  buildDocument,
  riskEngineRouteHelpersFactory,
  waitForRiskScoresToBePresent,
  createAndSyncRuleAndAlertsFactory,
  waitForRiskEngineTaskToBeGone,
  waitForSavedObjectToBeGone,
  waitForRiskScoresToBeGone,
} from '../../utils';
import { dataGeneratorFactory } from '../../../detections_response/utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const es = getService('es');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('@ess @ serverless @serverless QA risk_engine_cleanup_api', () => {
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

    it('should return response with success status', async () => {
      const status1 = await riskEngineRoutes.getStatus();
      expect(status1.body.risk_engine_status).to.be('NOT_INSTALLED');

      const firstDocumentId = uuidv4();
      await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, firstDocumentId)]);
      await createAndSyncRuleAndAlerts({ query: `id: ${firstDocumentId}` });

      await riskEngineRoutes.init();
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

      const status2 = await riskEngineRoutes.getStatus();
      expect(status2.body.risk_engine_status).to.be('ENABLED');

      const response = await riskEngineRoutes.cleanUp();
      expect(response.body).to.eql({
        cleanup_successful: true,
      });

      await waitForRiskEngineTaskToBeGone({ es, log });
      await waitForSavedObjectToBeGone({ log, kibanaServer });
      await waitForRiskScoresToBeGone({ es, log });

      const status3 = await riskEngineRoutes.getStatus();
      expect(status3.body.risk_engine_status).to.be('NOT_INSTALLED');
    });
  });
};
