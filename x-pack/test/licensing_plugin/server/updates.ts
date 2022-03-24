/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';
import { createScenario } from '../scenario';
import '../../../../test/plugin_functional/plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const { getService } = ftrContext;
  const testSubjects = getService('testSubjects');

  const scenario = createScenario(ftrContext);

  // FLAKY: https://github.com/elastic/kibana/issues/110938
  describe.skip('changes in license types', () => {
    after(async () => {
      await scenario.teardown();
    });

    it('provides changes in license types', async () => {
      await scenario.setup();
      await scenario.waitForPluginToDetectLicenseUpdate();
      const initialLicense = await scenario.getLicense();
      expect(initialLicense.license?.type).to.be('basic');
      // security enabled explicitly in test config
      expect(initialLicense.features?.security).to.eql({
        isAvailable: true,
        isEnabled: true,
      });

      // license hasn't changed
      await scenario.waitForPluginToDetectLicenseUpdate();
      const refetchedLicense = await scenario.getLicense();
      expect(refetchedLicense.license?.type).to.be('basic');
      expect(refetchedLicense.signature).to.be(initialLicense.signature);

      await scenario.startTrial();
      await scenario.waitForPluginToDetectLicenseUpdate();
      const trialLicense = await scenario.getLicense();
      expect(trialLicense.license?.type).to.be('trial');
      expect(trialLicense.signature).to.not.be(initialLicense.signature);

      expect(trialLicense.features?.security).to.eql({
        isAvailable: true,
        isEnabled: true,
      });

      await scenario.startBasic();
      await scenario.waitForPluginToDetectLicenseUpdate();
      const basicLicense = await scenario.getLicense();
      expect(basicLicense.license?.type).to.be('basic');
      expect(basicLicense.signature).not.to.be(initialLicense.signature);

      expect(basicLicense.features?.security).to.eql({
        isAvailable: true,
        isEnabled: true,
      });

      // banner shown only when license expired not just deleted
      await testSubjects.missingOrFail('licenseExpiredBanner');
    });

    it('properly recognize an enterprise license', async () => {
      await scenario.startEnterprise();
      await scenario.waitForPluginToDetectLicenseUpdate();

      const enterpriseLicense = await scenario.getLicense();
      expect(enterpriseLicense.license?.type).to.be('enterprise');
    });
  });
}
