/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('security', () => {
    const archive = 'monitoring/setup/collection/kibana_exclusive_mb';
    const timeRange = {
      min: '2019-04-09T00:00:00.741Z',
      max: '2019-04-09T23:59:59.741Z'
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should allow access to elevated user', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/setup/collection/cluster?skipLiveData=true')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body.hasPermissions).to.not.be(false);
    });

    it('should say permission denied for limited user', async () => {
      const username = 'limited_user';
      const password = 'changeme';

      await security.user.create(username, {
        password: password,
        full_name: 'Limited User',
        roles: ['kibana_user', 'monitoring_user']
      });

      const { body } = await supertestWithoutAuth
        .post('/api/monitoring/v1/setup/collection/cluster?skipLiveData=true')
        .auth(username, password)
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body._meta.hasPermissions).to.be(false);
    });
  });
}
