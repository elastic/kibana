/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  async function getPrivMonSoStatus() {
    return kibanaServer.savedObjects.find({
      type: 'privilege-monitoring-status',
    });
  }

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);

    before(async () => {
      await dataView.create('security-solution');
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await dataView.delete('security-solution');
    });

    describe('health', () => {
      it('should be healthy', async () => {
        log.info(`Checking health of privilege monitoring`);
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error(`Health check failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
      });
    });

    describe('disable', () => {
      it('should disable the privilege monitoring engine', async () => {
        log.info(`Disabling privilege monitoring engine`);
        await enablePrivmonSetting(kibanaServer);
        const res = await api.disableMonitoringEngine();

        if (res.status !== 200) {
          log.error(`Disable failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body.status).to.eql('disabled');
      });

      it('should not disable if privmon setting is disabled', async () => {
        log.info(`Disabling privilege monitoring setting`);
        await disablePrivmonSetting(kibanaServer);

        const res = await api.disableMonitoringEngine();

        expect(res.status).eql(500);
      });
    });

    describe('combination of init and disable', () => {
      afterEach(async () => {
        log.info(`Cleaning up after test`);
        try {
          await api.deleteMonitoringEngine({ query: { data: true } });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
      });

      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
      });

      it('should initialize and then disable the privilege monitoring engine', async () => {
        log.info(`Initializing privilege monitoring engine`);
        const initRes = await api.initMonitoringEngine();
        expect(initRes.status).eql(200);
        expect(initRes.body.status).to.eql('started');

        const soStatus = await getPrivMonSoStatus();
        expect(soStatus.saved_objects[0].attributes.status).to.eql('started');

        log.info(`Disabling privilege monitoring engine`);
        const disableRes = await api.disableMonitoringEngine();
        expect(disableRes.status).eql(200);
        expect(disableRes.body.status).to.eql('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus();
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).to.eql('disabled');

        log.info(`Re-disabling privilege monitoring engine`);
        const reDisableRes = await api.disableMonitoringEngine();
        expect(reDisableRes.status).eql(200);
        expect(reDisableRes.body.status).to.eql('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus();
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).to.eql('disabled');

        log.info(`Initializing privilege monitoring engine after disable`);
        const initResAfterDisable = await api.initMonitoringEngine();
        expect(initResAfterDisable.status).eql(200);
        expect(initResAfterDisable.body.status).to.eql('started');

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus();
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).to.eql('started');

        log.info(`Re-initializing privilege monitoring engine after disable`);
        const reInitRes = await api.initMonitoringEngine();
        expect(reInitRes.status).eql(200);
        expect(reInitRes.body.status).to.eql('started');

        const soStatusAfterReInit = await getPrivMonSoStatus();
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).to.eql('started');
      });
    });
  });
};
