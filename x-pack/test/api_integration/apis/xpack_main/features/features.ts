/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SecurityService } from '../../../../common/services';
import { Feature } from '../../../../../plugins/xpack_main/types';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security: SecurityService = getService('security');

  const expect404 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 404);
  };

  const expect200 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 200);
  };

  describe('/api/features', () => {
    describe('with the "global all" privilege', () => {
      it('should return a 200', async () => {
        const username = 'global_all';
        const roleName = 'global_all';
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            elasticsearch: {},
            kibana: [
              {
                base: ['all'],
                spaces: ['*'],
              },
            ],
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const result = await supertestWithoutAuth
            .get(`/api/features/v1`)
            .auth(username, password)
            .set('kbn-xsrf', 'foo')
            .then((response: any) => ({ error: undefined, response }))
            .catch((error: any) => ({ error, response: undefined }));

          expect200(result);
        } finally {
          await security.role.delete(roleName);
          await security.user.delete(username);
        }
      });
    });
    describe('without the "global all" privilege', () => {
      it('should return a 404', async () => {
        const username = 'dashboard_all';
        const roleName = 'dashboard_all';
        const password = `${username}-password`;
        try {
          await security.role.create(roleName, {
            elasticsearch: {},
            kibana: [
              {
                feature: {
                  dashboard: ['all'],
                },
                spaces: ['*'],
              },
            ],
          });

          await security.user.create(username, {
            password,
            roles: [roleName],
            full_name: 'a kibana user',
          });

          const result = await supertestWithoutAuth
            .get(`/api/features/v1`)
            .auth(username, password)
            .set('kbn-xsrf', 'foo')
            .then((response: any) => ({ error: undefined, response }))
            .catch((error: any) => ({ error, response: undefined }));

          expect404(result);
        } finally {
          await security.role.delete(roleName);
          await security.user.delete(username);
        }
      });
    });

    describe('with trial license', () => {
      it('should return a full feature set', async () => {
        const { body } = await supertest
          .get('/api/features/v1')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.be.an(Array);

        const featureIds = body.map((b: Feature) => b.id);
        expect(featureIds.sort()).to.eql(
          [
            'discover',
            'visualize',
            'dashboard',
            'dev_tools',
            'advancedSettings',
            'indexPatterns',
            'timelion',
            'graph',
            'monitoring',
            'savedObjectsManagement',
            'ml',
            'apm',
            'canvas',
            'code',
            'infrastructure',
            'logs',
            'maps',
            'uptime',
            'siem',
          ].sort()
        );
      });
    });
  });
}
