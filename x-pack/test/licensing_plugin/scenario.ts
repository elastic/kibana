/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PublicLicenseJSON } from '@kbn/licensing-plugin/server';
import { FtrProviderContext } from './services';
import '@kbn/core-provider-plugin/types';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function createScenario({ getService, getPageObjects }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esSupertestWithoutAuth = getService('esSupertestWithoutAuth');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'security']);
  const retry = getService('retry');

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
      await PageObjects.security.logout();
      await PageObjects.security.login('license_manager_user', 'license_manager_user-password');
    },

    // make sure a license is present, otherwise the security is not available anymore.
    async teardown() {
      await security.role.delete('license_manager-role');
      await security.user.delete('license_manager_user');
    },

    // elasticsearch allows to downgrade a license only once. other attempts will throw 403.
    async startBasic() {
      const response = await esSupertestWithoutAuth
        .post('/_license/start_basic?acknowledge=true')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.basic_was_started).to.be(true);
    },

    // elasticsearch allows to request trial only once. other attempts will throw 403.
    async startTrial() {
      const response = await esSupertestWithoutAuth
        .post('/_license/start_trial?acknowledge=true')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.trial_was_started).to.be(true);
    },

    async startEnterprise() {
      const response = await esSupertestWithoutAuth
        .post('/_license/?acknowledge=true')
        .send({
          license: {
            uid: '89e98f2b-c33e-4b86-b2fc-e2a9c50b7e48',
            type: 'enterprise',
            issue_date_in_millis: 1732060800000,
            expiry_date_in_millis: 1798761599999,
            max_nodes: null,
            max_resource_units: 250,
            issued_to:
              'Elastic - INTERNAL (development environments) (non-production environments)',
            issuer: 'API',
            signature:
              'AAAABQAAAA3qRa8oxcCGYexwpCR8AAAAIAo5/x6hrsGh1GqqrJmy4qgmEC7gK0U4zQ6q5ZEMhm4jAAABADNu1nLWe1tBP0/JMebh0StSAfu7pN/YtKi7IUG3dITPAWw63pMLyDUMSTkgR1FP4LOzPVYtYhliALt/ho/xBUsnjFfhEfTbdDwFrs70bzZ3U9nDsAvpZe6BjwSyuKpJTZW6Ebd2ZbZfZ3ZyuzPl8SNXUckSwd3TzrrmZzi7VD5vILMrgrAGJtlhzXirnLRoIA8hoRLzoHsMV/KiofmLLuWFP7YemdM2/l7KxJyz0HfdPhl89v/m3GumyX1QCmHOGNF0Vs1F6Rum79g4iZjGCp0SSOMQfQIaMMc0YgBIa5AdiuWQV5RtAYHxjZ4oidSADyVWnGQIAm9KLVhO3Y5HBGw=',
            start_date_in_millis: 1732060800000,
          },
        })
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.license_status).to.be('valid');
    },

    async deleteLicense() {
      const response = await esSupertestWithoutAuth
        .delete('/_license')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);

      expect(response.body.acknowledged).to.be(true);
    },

    async getLicense(): Promise<PublicLicenseJSON> {
      const { body } = await supertest.get('/api/licensing/info').expect(200);
      return body;
    },

    async waitForPluginToDetectLicenseUpdate() {
      const {
        body: { license: esLicense },
      } = await esSupertestWithoutAuth
        .get('/_license')
        .auth('license_manager_user', 'license_manager_user-password')
        .expect(200);
      // > --xpack.licensing.api_polling_frequency set in test config
      // to wait for Kibana server to re-fetch the license from Elasticsearch
      const pollingFrequency = 500;

      await retry.waitForWithTimeout(
        'waiting for the license.uid to match ES',
        4 * pollingFrequency,
        async () => {
          const {
            body: { license: kbLicense },
          } = await supertest.get('/api/licensing/info').expect(200);
          return kbLicense?.uid === esLicense?.uid;
        },
        () => delay(pollingFrequency)
      );
    },
  };
  return scenario;
}
