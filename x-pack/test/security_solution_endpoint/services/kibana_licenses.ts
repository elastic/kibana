/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../../functional/ftr_provider_context';
import { PublicLicenseJSON } from '../../../plugins/licensing/common/types';
import { parseDuration } from '../../../plugins/alerting/common';

const ROLE = 'license_manager-role';
const USER = 'license_manager_user';
const USER_PASSWORD = 'license_manager_user-password';

export class KibanaLicenses extends FtrService {
  private readonly security = this.ctx.getService('security');
  private readonly supertest = this.ctx.getService('supertest');
  private readonly esSupertestWithoutAuth = this.ctx.getService('supertestWithoutAuth');
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');

  private _userCreatePromise: Promise<void> | undefined = undefined;

  private async createLicenseManagerUser(): Promise<void> {
    if (this._userCreatePromise) {
      return this._userCreatePromise;
    }

    this._userCreatePromise = this.security.role
      .create(ROLE, {
        elasticsearch: {
          cluster: ['all'],
        },
        kibana: [
          {
            base: ['all'],
            spaces: ['*'],
          },
        ],
      })
      .then(() =>
        this.security.user.create(USER, {
          password: USER_PASSWORD,
          roles: [ROLE],
          full_name: 'license_manager user',
        })
      );
  }

  async startBasic() {
    await this.createLicenseManagerUser();

    // elasticsearch allows to downgrade a license only once. other attempts will throw 403.
    const response = await this.esSupertestWithoutAuth
      .post('/_license/start_basic?acknowledge=true')
      .auth(USER, USER_PASSWORD)
      .expect(200);

    expect(response.body.basic_was_started).to.be(true);
  }

  async startTrial() {
    await this.createLicenseManagerUser();

    // elasticsearch allows to request trial only once. other attempts will throw 403.
    const response = await this.esSupertestWithoutAuth
      .post('/_license/start_trial?acknowledge=true')
      .auth(USER, USER_PASSWORD)
      .expect(200);

    expect(response.body.trial_was_started).to.be(true);
  }

  async startEnterprise() {
    await this.createLicenseManagerUser();

    const response = await this.esSupertestWithoutAuth
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
      .auth(USER, USER_PASSWORD)
      .expect(200);

    expect(response.body.license_status).to.be('valid');
  }

  async deleteLicense() {
    await this.createLicenseManagerUser();

    const response = await this.esSupertestWithoutAuth
      .delete('/_license')
      .auth(USER, USER_PASSWORD)
      .expect(200);

    expect(response.body.acknowledged).to.be(true);
  }

  async getLicense(): Promise<PublicLicenseJSON> {
    const { body } = await this.supertest.get('/api/licensing/info').expect(200);
    return body;
  }

  async waitForKibanaToDetectLicenseUpdate() {
    // `--xpack.licensing.api_polling_frequency` should be set in the test config to a lower
    // value than what is used in production in order to speed up testing

    let pollingFrequency = 30000; // Default. 30s seems to be what the licensing plugin uses

    // Try to get the polling frequency from the server start up confiruation, case it was set explicitly that way
    const serverLicensingApiPollingFrequency = (
      this.config.get(['kbnTestServer', 'serverArgs']) as string[]
    ).find((setting) => /xpack\.licensing\.api_polling_frequency/.test(setting));

    if (serverLicensingApiPollingFrequency) {
      pollingFrequency = parseDuration(
        serverLicensingApiPollingFrequency.split('=').pop() as string
      );

      if (isNaN(pollingFrequency)) {
        pollingFrequency = 30000;
      }
    } else {
      this.log.info(
        `'xpack.licensing.api_polling_frequency' is not set. Using default polling frequency which could delay test execution`
      );
    }

    // wait for Kibana server to re-fetch the license from Elasticsearch
    await new Promise((res) => setTimeout(res, pollingFrequency));
  }
}
