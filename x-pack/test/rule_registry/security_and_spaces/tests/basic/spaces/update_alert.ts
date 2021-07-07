/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import {
  superUser,
  obsOnly,
  obsSec,
  noKibanaPrivileges,
  obsOnlySpacesAll,
  obsSecSpacesAll,
  secOnly,
  secOnlySpacesAll,
  obsOnlySpace2,
  obsSecAllSpace2,
} from '../../../../common/lib/authentication/users';
import type { User } from '../../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../../common/lib/authentication/spaces';

/*
 * Note - these tests focus on ensuring that the correct access
 * is granted based on spaces
 * For read/write and index specific testing see tests in the /spaces folder
 */

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';
  const APM_ALERT_ID = 'NoxgpHkBqbdrfX07MqXV';
  const SECURITY_SOLUTION_ALERT_ID = '020202';

  const getAPMIndexName = async (user: User) => {
    const {
      body: indexNames,
    }: { body: { index_name: string[] | undefined } } = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
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
      .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(200);
    const securitySolution = indexNames?.index_name?.find(
      (indexName) => indexName === '.alerts-security-solution'
    );
    expect(securitySolution).to.eql('.alerts-security-solution');
    return securitySolution;
  };

  describe('Alert - Update - RBAC - spaces', () => {
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

    describe('Users:', () => {
      describe('Security Solution', () => {
        describe('all spaces', () => {
          it(`${superUser.username} should be able to update Security Solution alerts in ${SPACE1}`, async () => {
            await supertestWithoutAuth
              .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
              .auth(superUser.username, superUser.password)
              .set('kbn-xsrf', 'true')
              .send({
                ids: [SECURITY_SOLUTION_ALERT_ID],
                status: 'closed',
                index: securitySolutionIndex,
                _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
              })
              .expect(200);
          });

          it(`${superUser.username} should be able to update Security Solution alerts in ${SPACE2}`, async () => {
            await supertestWithoutAuth
              .post(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}`)
              .auth(superUser.username, superUser.password)
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

        describe('single space', () => {
          [secOnly, obsSec, secOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should be able to update Security Solution alerts in ${SPACE1}`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
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

          [secOnly, obsSec, secOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should receive a 409 if trying to update an old alert document version`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
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
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
                  .auth(user.username, user.password)
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

          [noKibanaPrivileges, secOnly, obsSec]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should NOT be able to update Security Solution alerts in ${SPACE2}`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}`)
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
      });

      describe('APM', () => {
        describe('all spaces', () => {
          it(`${superUser.username} should be able to update APM alerts in ${SPACE1}`, async () => {
            await supertestWithoutAuth
              .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
              .auth(superUser.username, superUser.password)
              .set('kbn-xsrf', 'true')
              .send({
                ids: [APM_ALERT_ID],
                status: 'closed',
                index: apmIndex,
                _version: Buffer.from(JSON.stringify([0, 1]), 'utf8').toString('base64'),
              })
              .expect(200);
          });

          it(`${superUser.username} should be able to update APM alerts in ${SPACE2}`, async () => {
            await supertestWithoutAuth
              .post(`${getSpaceUrlPrefix(SPACE2)}${TEST_URL}`)
              .auth(superUser.username, superUser.password)
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

        describe('single space', () => {
          [obsOnly, obsSec, obsOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should be able to update APM alerts in ${SPACE1}`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
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

          [obsOnly, obsSec, obsOnlySpacesAll, obsSecSpacesAll]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should receive a 409 if trying to update an old alert document version`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
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
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
                  .auth(user.username, user.password)
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

          [noKibanaPrivileges, obsOnlySpace2, obsSecAllSpace2]
            .map((role) => ({
              user: role,
            }))
            .forEach(({ user }) => {
              it(`${user.username} should NOT be able to update APM alerts in ${SPACE1}`, async () => {
                await supertestWithoutAuth
                  .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
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
      });
    });
  });
};
