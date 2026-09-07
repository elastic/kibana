/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const kibanaServer = getService('kibanaServer');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');
  const spaces = getService('spaces');
  const supertest = getService('supertest');

  const customSpace = 'privmontestspace';
  const privMonUtilsCustomSpace = PrivMonUtils(getService, customSpace);

  async function getPrivMonSoStatus(space: string = 'default') {
    return kibanaServer.savedObjects.find({
      type: 'privilege-monitoring-status',
      space,
    });
  }

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring Engine Workflow', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const dataViewWithNamespace = dataViewRouteHelpersFactory(supertest, customSpace);

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

    // Initialize and disable workflow tests
    describe('privMon init and disable engine workflow', () => {
      afterEach(async () => {
        log.info('Cleaning up after test');
        try {
          await api.deleteMonitoringEngine({ query: { data: true } });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
      });

      it('should handle complete init-disable-reinit cycle', async () => {
        // Initialize engine
        log.info('Initializing privilege monitoring engine');
        await privMonUtils.initPrivMonEngine();
        const soStatus = await getPrivMonSoStatus();
        expect(soStatus.saved_objects[0].attributes.status).toBe('started');

        // Disable engine
        log.info('Disabling privilege monitoring engine');
        const disableRes = await api.disableMonitoringEngine();
        expect(disableRes.status).toBe(200);
        expect(disableRes.body.status).toBe('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus();
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Test re-disabling (should be idempotent)
        log.info('Re-disabling privilege monitoring engine');
        const reDisableRes = await api.disableMonitoringEngine();
        expect(reDisableRes.status).toBe(200);
        expect(reDisableRes.body.status).toBe('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus();
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Re-initialize after disable
        log.info('Initializing privilege monitoring engine after disable');
        await privMonUtils.initPrivMonEngine();

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus();
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).toBe('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable');
        await privMonUtils.initPrivMonEngine();

        const soStatusAfterReInit = await getPrivMonSoStatus();
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).toBe('started');
      });
    });

    // Custom space init and disable engine workflow tests
    describe('privMon init and disable engine workflow in custom space', () => {
      afterEach(async () => {
        log.info('Cleaning up after test in custom space');
        try {
          await api.deleteMonitoringEngine({ query: { data: true } }, customSpace);
        } catch (err) {
          log.warning(`Failed to clean up in afterEach for custom space: ${err.message}`);
        }
      });

      it('should handle complete init-disable-reinit cycle in custom space', async () => {
        // Initialize engine in custom space
        log.info('Initializing privilege monitoring engine in custom space');
        await privMonUtilsCustomSpace.initPrivMonEngine();

        const soStatus = await getPrivMonSoStatus(customSpace);
        expect(soStatus.saved_objects[0].attributes.status).toBe('started');

        // Disable engine in custom space
        log.info('Disabling privilege monitoring engine in custom space');
        const disableRes = await api.disableMonitoringEngine(customSpace);
        expect(disableRes.status).toBe(200);
        expect(disableRes.body.status).toBe('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Test re-disabling (should be idempotent)
        log.info('Re-disabling privilege monitoring engine in custom space');
        const reDisableRes = await api.disableMonitoringEngine(customSpace);
        expect(reDisableRes.status).toBe(200);
        expect(reDisableRes.body.status).toBe('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Re-initialize after disable
        log.info('Initializing privilege monitoring engine after disable in custom space');
        await privMonUtilsCustomSpace.initPrivMonEngine();

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).toBe('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable in custom space');
        await privMonUtilsCustomSpace.initPrivMonEngine();

        const soStatusAfterReInit = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).toBe('started');
      });
    });
  });
};
