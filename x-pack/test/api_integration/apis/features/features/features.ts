/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KibanaFeature } from '../../../../../plugins/features/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

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

          await supertestWithoutAuth
            .get('/api/features')
            .auth(username, password)
            .set('kbn-xsrf', 'foo')
            .expect(200);
        } finally {
          await security.role.delete(roleName);
          await security.user.delete(username);
        }
      });
    });
    describe('without the "global all" privilege', () => {
      it('should return a 403', async () => {
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

          await supertestWithoutAuth
            .get('/api/features')
            .auth(username, password)
            .set('kbn-xsrf', 'foo')
            .expect(403);
        } finally {
          await security.role.delete(roleName);
          await security.user.delete(username);
        }
      });
    });

    describe('with trial license', () => {
      it('should return a full feature set', async () => {
        const { body } = await supertest.get('/api/features').set('kbn-xsrf', 'xxx').expect(200);

        expect(body).to.be.an(Array);

        const featureIds = body.map((b: KibanaFeature) => b.id);
        expect(featureIds.sort()).to.eql(
          [
            'discover',
            'visualize',
            'dashboard',
            'dev_tools',
            'actions',
            'enterpriseSearch',
            'advancedSettings',
            'indexPatterns',
            'graph',
            'monitoring',
            'observabilityCases',
            'savedObjectsManagement',
            'savedObjectsTagging',
            'ml',
            'apm',
            'stackAlerts',
            'canvas',
            'generalCases',
            'infrastructure',
            'logs',
            'maps',
            'osquery',
            'uptime',
            'siem',
            'securitySolutionCases',
            'fleet',
            'fleetv2',
          ].sort()
        );
      });
    });
  });
}
