/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ILicense, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FtrProviderContext } from '../services';
import { createScenario } from '../scenario';
import '@kbn/core-provider-plugin/types';

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const { getService } = ftrContext;
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  const scenario = createScenario(ftrContext);

  describe('changes in license types', () => {
    after(async () => {
      await scenario.teardown();
    });

    const fetchLatestLicense = async (): Promise<ILicense> => {
      return await browser.executeAsync(async (cb) => {
        const {
          start: { core, plugins },
          testUtils,
        } = window._coreProvider;
        const licensing: LicensingPluginStart = plugins.licensing;

        // this call enforces signature check to detect license update and causes license re-fetch
        await core.http.get('/');
        // trigger a manual refresh, just to be sure
        await licensing.refresh();
        // wait a bit to make sure the older values have passed through the replay(1)
        await testUtils.delay(1000);
        cb(await licensing.getLicense());
      });
    };

    it('provides changes in license types', async () => {
      await scenario.setup();
      await scenario.waitForPluginToDetectLicenseUpdate();

      // fetch default license
      let license = await fetchLatestLicense();
      expect(license.type).to.be('basic');

      // license hasn't changed
      await scenario.waitForPluginToDetectLicenseUpdate();
      license = await fetchLatestLicense();
      expect(license.type).to.be('basic');

      // switch to trial (can do it only once)
      await scenario.startTrial();
      await scenario.waitForPluginToDetectLicenseUpdate();
      license = await fetchLatestLicense();
      expect(license.type).to.be('trial');

      // switch back to basic
      await scenario.startBasic();
      await scenario.waitForPluginToDetectLicenseUpdate();
      license = await fetchLatestLicense();
      expect(license.type).to.be('basic');

      // banner shown only when license expired not just deleted
      await testSubjects.missingOrFail('licenseExpiredBanner');
    });
  });
}
