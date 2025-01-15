/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { FtrProviderContext } from '../services';
import { createScenario } from '../scenario';
import '@kbn/core-provider-plugin/types';

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const { getService } = ftrContext;
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  const scenario = createScenario(ftrContext);

  // FLAKY: https://github.com/elastic/kibana/issues/53575
  describe.skip('changes in license types', () => {
    after(async () => {
      await scenario.teardown();
    });

    it('provides changes in license types', async () => {
      await scenario.setup();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb) => {
          const { setup, testUtils } = window._coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(1000);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe((license) => cb(license.type));
        })
      ).to.be('basic');

      // license hasn't changed
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb) => {
          const { setup, testUtils } = window._coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(1000);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe((license) => cb(license.type));
        })
      ).to.be('basic');

      await scenario.startTrial();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb) => {
          const { setup, testUtils } = window._coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(1000);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe((license) => cb(license.type));
        })
      ).to.be('trial');

      await scenario.startBasic();
      await scenario.waitForPluginToDetectLicenseUpdate();

      expect(
        await browser.executeAsync(async (cb) => {
          const { setup, testUtils } = window._coreProvider;
          // this call enforces signature check to detect license update
          // and causes license re-fetch
          await setup.core.http.get('/');
          await testUtils.delay(1000);

          const licensing: LicensingPluginSetup = setup.plugins.licensing;
          licensing.license$.subscribe((license) => cb(license.type));
        })
      ).to.be('basic');

      // banner shown only when license expired not just deleted
      await testSubjects.missingOrFail('licenseExpiredBanner');
    });
  });
}
