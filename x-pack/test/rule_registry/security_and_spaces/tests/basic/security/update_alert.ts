/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import {
  globalRead,
  secOnlySpacesAll,
  obsSecSpacesAll,
  obsOnlySpacesAll,
  obsOnlyReadSpacesAll,
  superUser,
  noKibanaPrivileges,
  obsSecReadSpacesAll,
  secOnlyReadSpacesAll,
} from '../../../../common/lib/authentication/users';
import type { User } from '../../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../../common/lib/authentication/spaces';

/*
 * Note - these tests focus on ensuring that the correct access
 * is granted based on read/all privileges and indices
 * Uses, users with access to default space, for space specific
 * testing see tests in the /spaces folder
 */

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const APM_ALERT_ID = 'NoxgpHkBqbdrfX07MqXV';
  const SECURITY_SOLUTION_ALERT_ID = '020202';

  const getAPMIndexName = async (user: User) => {
    const {
      body: indexNames,
    }: { body: { index_name: string[] | undefined } } = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix()}${ALERTS_INDEX_URL}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(200);
    const observabilityIndex = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-observability-apm'
    );
    expect(observabilityIndex).to.eql('.alerts-observability-apm');
    return observabilityIndex;
  };

  const getSecuritySolutionIndexName = async (user: User) => {
    const {
      body: indexNames,
    }: { body: { index_name: string[] | undefined } } = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix()}${ALERTS_INDEX_URL}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(200);
    const securitySolution = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-security-solution'
    );
    expect(securitySolution).to.eql('.alerts-security-solution');
    return securitySolution;
  };

  describe('Alerts - Update - RBAC - read/all checks', () => {
    describe('Users:', () => {
      let securitySolutionIndex: string | undefined;
      let apmIndex: string | undefined;

      beforeEach(async () => {
        securitySolutionIndex = await getSecuritySolutionIndexName(superUser);
        apmIndex = await getAPMIndexName(superUser);

        await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      });

      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
      });

      it('should return a 403 when security only user is trying to update an apm alert', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
          .auth(secOnlySpacesAll.username, secOnlySpacesAll.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: [APM_ALERT_ID],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          })
          .expect(403);
      });

      it('should return expected update confirmation upon successful update', async () => {
        const res = await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
          .auth(obsOnlySpacesAll.username, obsOnlySpacesAll.password)
          .set('kbn-xsrf', 'true')
          .send({
            ids: [APM_ALERT_ID],
            status: 'closed',
            index: apmIndex,
            _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
          });
        expect(res.body).to.eql({
          success: true,
          _index: '.alerts-observability-apm',
          _id: APM_ALERT_ID,
          result: 'updated',
          _shards: { total: 2, successful: 1, failed: 0 },
          _version: 'WzEsMV0=',
          _seq_no: 1,
          _primary_term: 1,
        });
      });

      describe('Security Solution', () => {
        describe('all', () => {
          [superUser, secOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should be able to update an alert`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(user.username, user.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [SECURITY_SOLUTION_ALERT_ID],
                    status: 'closed',
                    index: securitySolutionIndex,
                    _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
                  })
                  .expect(200);
              });
            });
        });

        describe('read', () => {
          [globalRead, secOnlyReadSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should NOT be able to update alert`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(user.username, user.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [SECURITY_SOLUTION_ALERT_ID],
                    status: 'closed',
                    index: securitySolutionIndex,
                    _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
                  })
                  .expect(403);
              });
            });
        });

        describe('concurrency control', () => {
          [superUser, secOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should receive a 409 if trying to update an old alert document version`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(user.username, user.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [SECURITY_SOLUTION_ALERT_ID],
                    status: 'closed',
                    index: securitySolutionIndex,
                    _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
                  })
                  .expect(200);

                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(superUser.username, superUser.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [SECURITY_SOLUTION_ALERT_ID],
                    status: 'closed',
                    index: securitySolutionIndex,
                    _version: Buffer.from(JSON.stringify([999, 999]), 'utf8').toString('base64'),
                  })
                  .expect(409);
              });
            });
        });
      });

      describe('APM', () => {
        describe('all', () => {
          [superUser, obsOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} with "all" privileges should be able to update alert`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(user.username, user.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [APM_ALERT_ID],
                    status: 'closed',
                    index: apmIndex,
                    _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
                  })
                  .expect(200);
              });
            });
        });

        describe('read', () => {
          [noKibanaPrivileges, obsOnlyReadSpacesAll, obsSecReadSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should NOT be able to update an alert`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(user.username, user.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [APM_ALERT_ID],
                    status: 'closed',
                    index: apmIndex,
                    _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
                  })
                  .expect(403);
              });
            });
        });

        describe('concurrency control', () => {
          [superUser, obsOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should receive a 409 if trying to update an old Security Solution alert document version`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(user.username, user.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [APM_ALERT_ID],
                    status: 'closed',
                    index: apmIndex,
                    _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
                  })
                  .expect(200);

                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
                  .auth(superUser.username, superUser.password)
                  .set('kbn-xsrf', 'true')
                  .send({
                    ids: [APM_ALERT_ID],
                    status: 'closed',
                    index: apmIndex,
                    _version: Buffer.from(JSON.stringify([999, 999]), 'utf8').toString('base64'),
                  })
                  .expect(409);
              });
            });
        });
      });
    });
  });
};
