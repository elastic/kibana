/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';
import { LicensingPluginSetup } from '../../../plugins/licensing/public';
import { createScenario } from '../scenario';
import '../../../../test/plugin_functional/plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function(ftrContext: FtrProviderContext) {
  const { getService } = ftrContext;
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  const scenario = createScenario(ftrContext);

  describe('changes in license types', () => {
    after(async () => {
      await scenario.startBasic();
      await scenario.waitForPluginToDetectLicenseUpdate();
      await scenario.teardown();
    });

    it('provides changes in license types', async () => {
      await scenario.setup();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb: Function) => {
          const { setup, testUtils } = window.__coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(100);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe(license => cb(license.type));
        })
      ).to.be('basic');

      // license hasn't changed
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb: Function) => {
          const { setup, testUtils } = window.__coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(100);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe(license => cb(license.type));
        })
      ).to.be('basic');

      await scenario.startTrial();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb: Function) => {
          const { setup, testUtils } = window.__coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(100);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe(license => cb(license.type));
        })
      ).to.be('trial');

      await scenario.startBasic();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb: Function) => {
          const { setup, testUtils } = window.__coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(100);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe(license => cb(license.type));
        })
      ).to.be('basic');

      await scenario.deleteLicense();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb: Function) => {
          const { setup, testUtils } = window.__coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(100);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe(license => cb(license.type));
        })
      ).to.be(null);

      // banner shown only when license expired not just deleted
      await testSubjects.missingOrFail('licenseExpiredBanner');
    });
  });
}
