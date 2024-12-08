/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  riskEngineRouteHelpersFactory,
  getRiskEngineConfigSO,
  waitForRiskEngineRun,
  waitForRiskEngineTaskToBeGone,
} from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const spaceName = 'space1';
  const supertest = getService('supertest');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const riskEngineRoutesForNamespace = riskEngineRouteHelpersFactory(supertest, spaceName);
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('@ess @ serverless @serverless QA risk_engine_so_update_config', () => {
    before(async () => {
      const soId = await kibanaServer.savedObjects.find({
        type: riskEngineConfigurationTypeName,
        space: spaceName,
      });
      if (soId.saved_objects.length !== 0) {
        await kibanaServer.savedObjects.delete({
          type: riskEngineConfigurationTypeName,
          space: spaceName,
          id: soId.saved_objects[0].id,
        });
      }
      const soId2 = await kibanaServer.savedObjects.find({
        type: riskEngineConfigurationTypeName,
      });
      if (soId2.saved_objects.length !== 0) {
        await kibanaServer.savedObjects.delete({
          type: riskEngineConfigurationTypeName,
          id: soId2.saved_objects[0].id,
        });
      }
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    after(async () => {
      const soId = await kibanaServer.savedObjects.find({
        type: riskEngineConfigurationTypeName,
        space: spaceName,
      });
      if (soId.saved_objects.length !== 0) {
        await kibanaServer.savedObjects.delete({
          type: riskEngineConfigurationTypeName,
          space: spaceName,
          id: soId.saved_objects[0].id,
        });
      }
      const soId2 = await kibanaServer.savedObjects.find({
        type: riskEngineConfigurationTypeName,
      });
      if (soId2.saved_objects.length !== 0) {
        await kibanaServer.savedObjects.delete({
          type: riskEngineConfigurationTypeName,
          id: soId2.saved_objects[0].id,
        });
      }
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
    });

    it('should include the right keys as per the update', async () => {
      await riskEngineRoutes.init();
      await waitForRiskEngineRun;

      const currentSoConfig = await getRiskEngineConfigSO({ kibanaServer });

      expect(currentSoConfig.attributes).to.not.have.property('excludeAlertTags');
      expect(currentSoConfig.attributes).to.not.have.property('excludeAlertStatuses');

      const updatedSoBody = {
        exclude_alert_tags: ['False Positive'],
        exclude_alert_statuses: ['open'],
      };

      await riskEngineRoutes.soConfig(updatedSoBody, 200);
      const currentSoConfig2 = await getRiskEngineConfigSO({ kibanaServer });

      expect(currentSoConfig2.attributes).to.have.property('excludeAlertTags');
      expect(currentSoConfig2.attributes).to.have.property('excludeAlertStatuses');

      await riskEngineRoutes.disable();
      await waitForRiskEngineTaskToBeGone;

      updatedSoBody.exclude_alert_statuses = [];

      await riskEngineRoutes.soConfig(updatedSoBody, 200);

      await riskEngineRoutes.enable();
      await waitForRiskEngineRun;

      const currentSoConfig3 = await getRiskEngineConfigSO({ kibanaServer });
      expect(JSON.stringify(currentSoConfig3.attributes.excludeAlertStatuses)).to.equal(
        JSON.stringify(updatedSoBody.exclude_alert_statuses)
      );
    });

    it('should succeed while updating the saved object', async () => {
      await riskEngineRoutes.init();
      await waitForRiskEngineRun;

      const updatedSoBody = {
        exclude_alert_tags: ['False Positive'],
        exclude_alert_statuses: ['open'],
      };
      const response = await riskEngineRoutes.soConfig(updatedSoBody);
      expect(response.status).to.equal(200);
    });

    it('should update the config in the right space', async () => {
      await riskEngineRoutesForNamespace.init();
      await riskEngineRoutes.init();
      await waitForRiskEngineRun;

      const updatedSoBody = {
        exclude_alert_tags: ['False Positive'],
        exclude_alert_statuses: ['open', 'closed'],
      };

      await riskEngineRoutesForNamespace.soConfig(updatedSoBody, 200);
      const currentSoConfig = await getRiskEngineConfigSO({ kibanaServer, space: 'space1' });

      expect(currentSoConfig.namespaces).to.eql(['space1']);
      expect(currentSoConfig.attributes.excludeAlertTags).to.eql(updatedSoBody.exclude_alert_tags);
      expect(currentSoConfig.attributes.excludeAlertStatuses).to.eql(
        updatedSoBody.exclude_alert_statuses
      );
    });
  });
};
