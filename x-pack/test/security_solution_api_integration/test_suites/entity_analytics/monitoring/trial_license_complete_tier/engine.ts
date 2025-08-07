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
  const spaces = getService('spaces');
  const customSpace = 'privmontestspace';

  async function getPrivMonSoStatus(space: string = 'default') {
    return kibanaServer.savedObjects.find({
      type: 'privilege-monitoring-status',
      space,
    });
  }

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const dataViewWithNamespace = dataViewRouteHelpersFactory(supertest, customSpace);

    // Global setup and teardown
    before(async () => {
      await dataView.create('security-solution');
      await spaces.create({
        id: customSpace,
        name: customSpace,
        disabledFeatures: [],
      });
      await dataViewWithNamespace.create('security-solution');
    });

    after(async () => {
      await dataView.delete('security-solution');
      await dataViewWithNamespace.delete('security-solution');
      await spaces.delete(customSpace);
    });

    // Health check tests
    describe('health', () => {
      before(async () => {
        await enablePrivmonSetting(kibanaServer);
      });

      after(async () => {
        await disablePrivmonSetting(kibanaServer);
      });

      it('should be healthy', async () => {
        log.info('Checking health of privilege monitoring');
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error('Health check failed');
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
      });
    });

    // Disable functionality tests
    describe('privMon disable engine', () => {
      before(async () => {
        // Initialize engines for both default and custom spaces
        await enablePrivmonSetting(kibanaServer);
        await enablePrivmonSetting(kibanaServer, customSpace);
        await api.initMonitoringEngine();
        await api.initMonitoringEngine(customSpace);
      });

      after(async () => {
        // Clean up engines and settings
        await disablePrivmonSetting(kibanaServer);
        await disablePrivmonSetting(kibanaServer, customSpace);
        await api.deleteMonitoringEngine({ query: { data: true } });
        await api.deleteMonitoringEngine({ query: { data: true } }, customSpace);
      });

      it('should disable the privilege monitoring engine in default space', async () => {
        log.info('Disabling privilege monitoring engine');
        const res = await api.disableMonitoringEngine();

        if (res.status !== 200) {
          log.error('Disable failed');
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body.status).to.eql('disabled');
      });

      it('should disable the privilege monitoring engine in custom space', async () => {
        log.info('Disabling privilege monitoring engine in custom space');

        // Re-initialize for this test since previous test disabled it
        await api.initMonitoringEngine(customSpace);
        const res = await api.disableMonitoringEngine(customSpace);

        if (res.status !== 200) {
          log.error('Disable failed in custom space');
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body.status).to.eql('disabled');
      });

      it('should not disable when setting is disabled in default space', async () => {
        log.info('Testing disable with setting disabled');
        await disablePrivmonSetting(kibanaServer);

        const res = await api.disableMonitoringEngine();
        expect(res.status).eql(500);
      });

      it('should not disable when setting is disabled in custom space', async () => {
        log.info('Testing disable with setting disabled in custom space');
        await disablePrivmonSetting(kibanaServer, customSpace);

        const res = await api.disableMonitoringEngine(customSpace);
        expect(res.status).eql(500);
      });
    });

    // Initialize and disable workflow tests
    describe('privMon init and disable engine workflow', () => {
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
      });

      afterEach(async () => {
        log.info('Cleaning up after test');
        try {
          await api.deleteMonitoringEngine({ query: { data: true } });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
        await disablePrivmonSetting(kibanaServer);
      });

      it('should handle complete init-disable-reinit cycle', async () => {
        // Initialize engine
        log.info('Initializing privilege monitoring engine');
        const initRes = await api.initMonitoringEngine();
        expect(initRes.status).eql(200);
        expect(initRes.body.status).to.eql('started');

        const soStatus = await getPrivMonSoStatus();
        expect(soStatus.saved_objects[0].attributes.status).to.eql('started');

        // Disable engine
        log.info('Disabling privilege monitoring engine');
        const disableRes = await api.disableMonitoringEngine();
        expect(disableRes.status).eql(200);
        expect(disableRes.body.status).to.eql('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus();
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).to.eql('disabled');

        // Test re-disabling (should be idempotent)
        log.info('Re-disabling privilege monitoring engine');
        const reDisableRes = await api.disableMonitoringEngine();
        expect(reDisableRes.status).eql(200);
        expect(reDisableRes.body.status).to.eql('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus();
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).to.eql('disabled');

        // Re-initialize after disable
        log.info('Initializing privilege monitoring engine after disable');
        const initResAfterDisable = await api.initMonitoringEngine();
        expect(initResAfterDisable.status).eql(200);
        expect(initResAfterDisable.body.status).to.eql('started');

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus();
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).to.eql('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable');
        const reInitRes = await api.initMonitoringEngine();
        expect(reInitRes.status).eql(200);
        expect(reInitRes.body.status).to.eql('started');

        const soStatusAfterReInit = await getPrivMonSoStatus();
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).to.eql('started');
      });
    });

    // Custom space init and disable engine workflow tests
    describe('privMon init and disable engine workflow in custom space', () => {
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer, customSpace);
      });

      afterEach(async () => {
        log.info('Cleaning up after test in custom space');
        try {
          await api.deleteMonitoringEngine({ query: { data: true } }, customSpace);
        } catch (err) {
          log.warning(`Failed to clean up in afterEach for custom space: ${err.message}`);
        }
        await disablePrivmonSetting(kibanaServer, customSpace);
      });

      it('should handle complete init-disable-reinit cycle in custom space', async () => {
        // Initialize engine in custom space
        log.info('Initializing privilege monitoring engine in custom space');
        const initRes = await api.initMonitoringEngine(customSpace);
        expect(initRes.status).eql(200);
        expect(initRes.body.status).to.eql('started');

        const soStatus = await getPrivMonSoStatus(customSpace);
        expect(soStatus.saved_objects[0].attributes.status).to.eql('started');

        // Disable engine in custom space
        log.info('Disabling privilege monitoring engine in custom space');
        const disableRes = await api.disableMonitoringEngine(customSpace);
        expect(disableRes.status).eql(200);
        expect(disableRes.body.status).to.eql('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).to.eql('disabled');

        // Test re-disabling (should be idempotent)
        log.info('Re-disabling privilege monitoring engine in custom space');
        const reDisableRes = await api.disableMonitoringEngine(customSpace);
        expect(reDisableRes.status).eql(200);
        expect(reDisableRes.body.status).to.eql('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).to.eql('disabled');

        // Re-initialize after disable
        log.info('Initializing privilege monitoring engine after disable in custom space');
        const initResAfterDisable = await api.initMonitoringEngine(customSpace);
        expect(initResAfterDisable.status).eql(200);
        expect(initResAfterDisable.body.status).to.eql('started');

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).to.eql('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable in custom space');
        const reInitRes = await api.initMonitoringEngine(customSpace);
        expect(reInitRes.status).eql(200);
        expect(reInitRes.body.status).to.eql('started');

        const soStatusAfterReInit = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).to.eql('started');
      });
    });
  });
};
