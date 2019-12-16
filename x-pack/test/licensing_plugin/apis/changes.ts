/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';
import { PublicLicenseJSON } from '../../../plugins/licensing/server';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esSupertestWithoutAuth = getService('esSupertestWithoutAuth');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'security']);
  const testSubjects = getService('testSubjects');

  const scenario = {
    async setup() {
      await security.role.create('license_manager-role', {
        elasticsearch: {
          cluster: ['all'],
        },
        kibana: [
          {
            base: ['all'],
            spaces: ['*'],
          },
        ],
      });

      await security.user.create('license_manager_user', {
        password: 'license_manager_user-password',
        roles: ['license_manager-role'],
        full_name: 'license_manager user',
      });

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
      await PageObjects.security.login('license_manager_user', 'license_manager_user-password');
    },

    async teardown() {
      await security.role.delete('license_manager-role');
    },

    async startBasic() {
      const response = await esSupertestWithoutAuth
        .post('/_license/start_basic?acknowledge=true')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.basic_was_started).to.be(true);
    },

    async startTrial() {
      const response = await esSupertestWithoutAuth
        .post('/_license/start_trial?acknowledge=true')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.trial_was_started).to.be(true);
    },

    async deleteLicense() {
      const response = await esSupertestWithoutAuth
        .delete('/_license')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.acknowledged).to.be(true);
    },

    async getLicense(): Promise<PublicLicenseJSON> {
      // > --xpack.licensing.api_polling_frequency set in test config
      // to wait for Kibana server to re-fetch the license from Elasticsearch
      await delay(1000);

      const { body } = await supertest.get('/api/licensing/info').expect(200);
      return body;
    },
  };

  describe('changes in license types', () => {
    after(async () => {
      await scenario.startBasic();
    });

    it('provides changes in license types', async () => {
      await scenario.setup();
      const initialLicense = await scenario.getLicense();
      expect(initialLicense.license?.type).to.be('basic');
      // security enabled explicitly in test config
      expect(initialLicense.features?.security).to.eql({
        isAvailable: true,
        isEnabled: true,
      });

      const {
        body: legacyInitialLicense,
        headers: legacyInitialLicenseHeaders,
      } = await supertest.get('/api/xpack/v1/info').expect(200);

      expect(legacyInitialLicense.license?.type).to.be('basic');
      expect(legacyInitialLicense.features).to.have.property('security');
      expect(legacyInitialLicenseHeaders['kbn-xpack-sig']).to.be.a('string');

      // license hasn't changed
      const refetchedLicense = await scenario.getLicense();
      expect(refetchedLicense.license?.type).to.be('basic');
      expect(refetchedLicense.signature).to.be(initialLicense.signature);

      const {
        body: legacyRefetchedLicense,
        headers: legacyRefetchedLicenseHeaders,
      } = await supertest.get('/api/xpack/v1/info').expect(200);

      expect(legacyRefetchedLicense.license?.type).to.be('basic');
      expect(legacyRefetchedLicenseHeaders['kbn-xpack-sig']).to.be(
        legacyInitialLicenseHeaders['kbn-xpack-sig']
      );

      // server allows to request trial only once.
      // other attempts will throw 403
      await scenario.startTrial();
      const trialLicense = await scenario.getLicense();
      expect(trialLicense.license?.type).to.be('trial');
      expect(trialLicense.signature).to.not.be(initialLicense.signature);
      expect(trialLicense.features?.security).to.eql({
        isAvailable: true,
        isEnabled: true,
      });

      const { body: legacyTrialLicense, headers: legacyTrialLicenseHeaders } = await supertest
        .get('/api/xpack/v1/info')
        .expect(200);

      expect(legacyTrialLicense.license?.type).to.be('trial');
      expect(legacyTrialLicense.features).to.have.property('security');
      expect(legacyTrialLicenseHeaders['kbn-xpack-sig']).to.not.be(
        legacyInitialLicenseHeaders['kbn-xpack-sig']
      );

      await scenario.startBasic();
      const basicLicense = await scenario.getLicense();
      expect(basicLicense.license?.type).to.be('basic');
      expect(basicLicense.signature).not.to.be(initialLicense.signature);

      expect(basicLicense.features?.security).to.eql({
        isAvailable: true,
        isEnabled: true,
      });

      const { body: legacyBasicLicense, headers: legacyBasicLicenseHeaders } = await supertest
        .get('/api/xpack/v1/info')
        .expect(200);
      expect(legacyBasicLicense.license?.type).to.be('basic');
      expect(legacyBasicLicense.features).to.have.property('security');
      expect(legacyBasicLicenseHeaders['kbn-xpack-sig']).to.not.be(
        legacyInitialLicenseHeaders['kbn-xpack-sig']
      );

      await scenario.deleteLicense();
      const inactiveLicense = await scenario.getLicense();
      expect(inactiveLicense.signature).to.not.be(initialLicense.signature);
      expect(inactiveLicense).to.not.have.property('license');
      expect(inactiveLicense.features?.security).to.eql({
        isAvailable: false,
        isEnabled: true,
      });
      // banner shown only when license expired not just deleted
      await testSubjects.missingOrFail('licenseExpiredBanner');
    });
  });
}
