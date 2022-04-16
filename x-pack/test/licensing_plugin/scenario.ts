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
            uid: '00000000-d3ad-7357-c0d3-000000000000',
            type: 'enterprise',
            issue_date_in_millis: 1577836800000,
            start_date_in_millis: 1577836800000,
            // expires 2022-12-31
            expiry_date_in_millis: 1672531199999,
            max_resource_units: 250,
            max_nodes: null,
            issued_to: 'Elastic Internal Use (development environments)',
            issuer: 'Elastic',
            signature:
              'AAAABQAAAA1gHUVis7hel8b8nNCAAAAAIAo5/x6hrsGh1GqqrJmy4qgmEC7gK0U4zQ6q5ZEMhm4jAAABAKMR+w3KZsMJfG5jNWgZXJLwRmiNqN7k94vKFgRdj1yM+gA9ufhXIn9d01OvFhPjilIqm+fxVjCxXwGKbFRiwtTWnTYjXPuNml+qCFGgUWguWEcVoIW6VU7/lYOqMJ4EB4zOMLe93P267iaDm542aelQrW1OJ69lGGuPBik8v9r1bNZzKBQ99VUr/qoosGDAm0udh2HxWzYoCL5lDML5Niy87xlVCubSSBXdUXzUgdZKKk6pKaMdHswB1gjvEfnwqPxEWAyrV0BCr/T1WehXd7U4p6/zt6sJ6cPh+34AZe9g4+3WPKrZhX4iaSHMDDHn4HNjO72CZ2oi42ZDNnJ37tA=',
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
      // > --xpack.licensing.api_polling_frequency set in test config
      // to wait for Kibana server to re-fetch the license from Elasticsearch
      await delay(500);
    },
  };
  return scenario;
}
