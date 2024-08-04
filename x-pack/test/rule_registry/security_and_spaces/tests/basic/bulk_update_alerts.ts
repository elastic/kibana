/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import {
  superUser,
  globalRead,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  secOnlySpace2,
  secOnlyReadSpace2,
  obsSecAllSpace2,
  obsSecReadSpace2,
  obsOnlySpace2,
  obsOnlyReadSpace2,
  obsOnlySpacesAll,
  obsSecSpacesAll,
  secOnlySpacesAll,
  noKibanaPrivileges,
} from '../../../common/lib/authentication/users';

import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

interface TestCase {
  /** The space where the alert exists */
  space: string;
  /** The ID of the alert */
  alertId: string;
  /** The index of the alert */
  index: string;
  /** Authorized users */
  authorizedUsers: User[];
  /** Unauthorized users */
  unauthorizedUsers: User[];
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';
  const APM_ALERT_ID = 'NoxgpHkBqbdrfX07MqXV';
  const APM_ALERT_INDEX = '.alerts-observability.apm.alerts';
  const SECURITY_SOLUTION_ALERT_ID = '020202';
  const SECURITY_SOLUTION_ALERT_INDEX = '.alerts-security.alerts';

  const getAPMIndexName = async (user: User) => {
    const { body: indexNames }: { body: { index_name: string[] | undefined } } =
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
        .auth(user.username, user.password)
        .set('kbn-xsrf', 'true')
        .expect(200);
    const observabilityIndex = indexNames?.index_name?.find(
      (indexName) => indexName === APM_ALERT_INDEX
    );
    expect(observabilityIndex).to.eql(APM_ALERT_INDEX); // assert this here so we can use constants in the dynamically-defined test cases below
  };

  const getSecuritySolutionIndexName = async (user: User) => {
    const { body: indexNames }: { body: { index_name: string[] | undefined } } =
      await supertestWithoutAuth
        .get(`${getSpaceUrlPrefix(SPACE1)}${ALERTS_INDEX_URL}`)
        .auth(user.username, user.password)
        .set('kbn-xsrf', 'true')
        .expect(200);
    const securitySolution = indexNames?.index_name?.find((indexName) =>
      indexName.startsWith(SECURITY_SOLUTION_ALERT_INDEX)
    );
    expect(securitySolution).to.eql(`${SECURITY_SOLUTION_ALERT_INDEX}-${SPACE1}`); // assert this here so we can use constants in the dynamically-defined test cases below
  };

  describe('Alert - Bulk Update - RBAC - spaces', () => {
    before(async () => {
      await getSecuritySolutionIndexName(superUser);
      await getAPMIndexName(superUser);
    });

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    function addTests({ space, authorizedUsers, unauthorizedUsers, alertId, index }: TestCase) {
      authorizedUsers.forEach(({ username, password }) => {
        it(`${username} should bulk update alert with given id ${alertId} in ${space}/${index}`, async () => {
          const { body: updated } = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}/bulk_update`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({
              ids: [alertId],
              status: 'closed',
              index,
            });
          expect(updated.statusCode).to.eql(200);
          const items = updated.body.items;
          // @ts-expect-error
          items.map((item) => expect(item.update.result).to.eql('updated'));
        });

        it(`${username} should bulk update alerts which match KQL query string in ${space}/${index}`, async () => {
          const { body: updated } = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}/bulk_update`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({
              status: 'closed',
              query: `${ALERT_WORKFLOW_STATUS}: open`,
              index,
            });
          expect(updated.statusCode).to.eql(200);
          expect(updated.body.updated).to.greaterThan(0);
        });

        it(`${username} should bulk update alerts which match query in DSL in ${space}/${index}`, async () => {
          const { body: updated } = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}/bulk_update`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({
              status: 'closed',
              query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
              index,
            });
          expect(updated.statusCode).to.eql(200);
          expect(updated.body.updated).to.greaterThan(0);
        });
      });

      unauthorizedUsers.forEach(({ username, password }) => {
        it(`${username} should NOT be able to update alert ${alertId} in ${space}/${index}`, async () => {
          const res = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}/bulk_update`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({
              ids: [alertId],
              status: 'closed',
              index,
            });
          expect([403, 404]).to.contain(res.statusCode);
        });
      });
    }

    // Alert - Update - RBAC - spaces Security Solution superuser should bulk update alerts which match query in space1/.alerts-security.alerts
    // Alert - Update - RBAC - spaces superuser should bulk update alert with given id 020202 in space1/.alerts-security.alerts
    describe('Security Solution', () => {
      const authorizedInAllSpaces = [superUser, secOnlySpacesAll, obsSecSpacesAll];
      const authorizedOnlyInSpace1 = [secOnly, obsSec];
      const authorizedOnlyInSpace2 = [secOnlySpace2, obsSecAllSpace2];
      const unauthorized = [
        // these users are not authorized to update alerts for the Security Solution in any space
        globalRead,
        secOnlyRead,
        obsSecRead,
        secOnlyReadSpace2,
        obsSecReadSpace2,
        obsOnly,
        obsOnlyRead,
        obsOnlySpace2,
        obsOnlyReadSpace2,
        obsOnlySpacesAll,
        noKibanaPrivileges,
      ];

      addTests({
        space: SPACE1,
        alertId: SECURITY_SOLUTION_ALERT_ID,
        index: SECURITY_SOLUTION_ALERT_INDEX,
        authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace1],
        unauthorizedUsers: [...authorizedOnlyInSpace2, ...unauthorized],
      });
      addTests({
        space: SPACE2,
        alertId: SECURITY_SOLUTION_ALERT_ID,
        index: SECURITY_SOLUTION_ALERT_INDEX,
        authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace2],
        unauthorizedUsers: [...authorizedOnlyInSpace1, ...unauthorized],
      });
    });

    describe('APM', () => {
      const authorizedInAllSpaces = [superUser, obsOnlySpacesAll, obsSecSpacesAll];
      const authorizedOnlyInSpace1 = [obsOnly, obsSec];
      const authorizedOnlyInSpace2 = [obsOnlySpace2, obsSecAllSpace2];
      const unauthorized = [
        // these users are not authorized to update alerts for APM in any space
        globalRead,
        obsOnlyRead,
        obsSecRead,
        obsOnlyReadSpace2,
        obsSecReadSpace2,
        secOnly,
        secOnlyRead,
        secOnlySpace2,
        secOnlyReadSpace2,
        secOnlySpacesAll,
        noKibanaPrivileges,
      ];

      addTests({
        space: SPACE1,
        alertId: APM_ALERT_ID,
        index: APM_ALERT_INDEX,
        authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace1],
        unauthorizedUsers: [...authorizedOnlyInSpace2, ...unauthorized],
      });
      addTests({
        space: SPACE2,
        alertId: APM_ALERT_ID,
        index: APM_ALERT_INDEX,
        authorizedUsers: [...authorizedInAllSpaces, ...authorizedOnlyInSpace2],
        unauthorizedUsers: [...authorizedOnlyInSpace1, ...unauthorized],
      });
    });
  });
};
