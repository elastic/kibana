/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Privileges registration', function () {
    this.tags(['skipCloud']);

    it('privileges are re-registered on license downgrade', async () => {
      // Verify currently registered privileges for TRIAL license.
      // If you're adding a privilege to the following, that's great!
      // If you're removing a privilege, this breaks backwards compatibility
      // Roles are associated with these privileges, and we shouldn't be removing them in a minor version.
      const expectedTrialLicenseDiscoverPrivileges = [
        'all',
        'read',
        'minimal_all',
        'minimal_read',
        'url_create',
        'store_search_session',
      ];
      const trialPrivileges = await supertest
        .get('/api/security/privileges')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200);

      expect(trialPrivileges.body.features.discover).to.eql(expectedTrialLicenseDiscoverPrivileges);

      // Revert license to basic.
      await supertest
        .post('/api/license/start_basic?acknowledge=true')
        .set('kbn-xsrf', 'xxx')
        .expect(200, {
          basic_was_started: true,
          acknowledged: true,
        });

      // Verify that privileges were re-registered.
      const expectedBasicLicenseDiscoverPrivileges = ['all', 'read', 'minimal_all', 'minimal_read'];
      const basicPrivileges = await supertest
        .get('/api/security/privileges')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200);

      expect(basicPrivileges.body.features.discover).to.eql(expectedBasicLicenseDiscoverPrivileges);
    });
  });
}
