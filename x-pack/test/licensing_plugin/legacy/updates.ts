/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';
import { createScenario } from '../scenario';
import '../../../../test/plugin_functional/plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const { getService } = ftrContext;
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');

  const scenario = createScenario(ftrContext);

  describe('changes in license types', () => {
    after(async () => {
      await scenario.teardown();
    });

    it('provides changes in license types', async () => {
      await scenario.setup();
      await scenario.waitForPluginToDetectLicenseUpdate();

      const {
        body: legacyInitialLicense,
        header: legacyInitialLicenseHeaders,
      } = await supertest.get('/api/xpack/v1/info').expect(200);

      expect(legacyInitialLicense.license?.type).to.be('basic');
      expect(legacyInitialLicenseHeaders['kbn-xpack-sig']).to.be.a('string');

      await scenario.startTrial();
      await scenario.waitForPluginToDetectLicenseUpdate();

      const { body: legacyTrialLicense, header: legacyTrialLicenseHeaders } = await supertest
        .get('/api/xpack/v1/info')
        .expect(200);

      expect(legacyTrialLicense.license?.type).to.be('trial');
      expect(legacyTrialLicenseHeaders['kbn-xpack-sig']).to.not.be(
        legacyInitialLicenseHeaders['kbn-xpack-sig']
      );

      await scenario.startBasic();
      await scenario.waitForPluginToDetectLicenseUpdate();

      const { body: legacyBasicLicense } = await supertest.get('/api/xpack/v1/info').expect(200);
      expect(legacyBasicLicense.license?.type).to.be('basic');

      // banner shown only when license expired not just deleted
      await testSubjects.missingOrFail('licenseExpiredBanner');
    });
  });
}
