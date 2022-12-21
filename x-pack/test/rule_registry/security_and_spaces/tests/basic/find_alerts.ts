/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
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
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';
  const APM_ALERT_ID = 'NoxgpHkBqbdrfX07MqXV';
  const APM_ALERT_INDEX = '.alerts-observability.apm.alerts';
  const SECURITY_SOLUTION_ALERT_ID = '020202';
  const SECURITY_SOLUTION_ALERT_INDEX = '.alerts-security.alerts';

  describe('Alert - Find - RBAC - spaces', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    it(`${superUser.username} should reject at route level when aggs contains script alerts which match query in ${SPACE1}/${SECURITY_SOLUTION_ALERT_INDEX}`, async () => {
      const found = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          aggs: {
            alertsByGroupingCount: {
              terms: {
                field: 'kibana.alert.rule.name',
                order: {
                  _count: 'desc',
                },
                script: {
                  source: 'SCRIPT',
                },
                size: 10000,
              },
            },
          },
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });
      expect(found.statusCode).to.eql(400);
    });

    it(`${superUser.username} should reject at route level when nested aggs contains script alerts which match query in ${SPACE1}/${SECURITY_SOLUTION_ALERT_INDEX}`, async () => {
      const found = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          aggs: {
            alertsByGroupingCount: {
              terms: {
                field: 'kibana.alert.rule.name',
                order: {
                  _count: 'desc',
                },
                size: 10000,
              },
              aggs: {
                test: {
                  terms: {
                    field: 'kibana.alert.rule.name',
                    size: 10,
                    script: {
                      source: 'SCRIPT',
                    },
                  },
                },
              },
            },
          },
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });
      expect(found.statusCode).to.eql(400);
    });

    it(`${superUser.username} should allow nested aggs and return alerts which match query in ${SPACE1}/${SECURITY_SOLUTION_ALERT_INDEX}`, async () => {
      const found = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          aggs: {
            alertsByGroupingCount: {
              terms: {
                field: 'kibana.alert.rule.name',
                order: {
                  _count: 'desc',
                },
                size: 10000,
              },
              aggs: {
                test: {
                  terms: {
                    field: 'kibana.alert.rule.name',
                    size: 10,
                  },
                },
              },
            },
          },
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });
      expect(found.statusCode).to.eql(200);
      expect(found.body.hits.total.value).to.be.above(0);
    });

    it(`${superUser.username} should allow a custom sort and return alerts which match query in ${SPACE1}/${SECURITY_SOLUTION_ALERT_INDEX}`, async () => {
      const found = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          sort: [
            {
              '@timestamp': 'desc', // the default in alerts_client.ts is timestamp ascending, so we are testing the reverse of that.
            },
          ],
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });
      expect(found.statusCode).to.eql(200);
      expect(found.body.hits.total.value).to.be.above(0);

      let lastSort = Infinity;

      found.body.hits.hits.forEach((hit: any) => {
        expect(hit.sort).to.be.above(0);

        if (hit.sort > lastSort) {
          throw new Error('sort by timestamp desc failed.');
        }

        lastSort = hit.sort;
      });
    });

    it(`${superUser.username} should handle an invalid custom sort`, async () => {
      const found = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          sort: [
            {
              asdf: 'invalid',
            },
          ],
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });
      expect(found.statusCode).to.eql(404);
    });

    it(`${superUser.username} should allow a custom sort (using search_after) and return alerts which match query in ${SPACE1}/${SECURITY_SOLUTION_ALERT_INDEX}`, async () => {
      const firstSearch = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          sort: [
            {
              '@timestamp': 'desc', // the default in alerts_client.ts is timestamp ascending, so we are testing the reverse of that.
            },
          ],
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });

      // grab second to last event cursor
      const hits = firstSearch.body.hits.hits;
      const cursor = hits[hits.length - 2].sort[0];

      const secondSearch = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
          sort: [
            {
              '@timestamp': 'desc', // the default in alerts_client.ts is timestamp ascending, so we are testing the reverse of that.
            },
          ],
          search_after: [cursor],
          index: SECURITY_SOLUTION_ALERT_INDEX,
        });

      expect(secondSearch.body.hits.hits.length).equal(1);

      // there should only be one result, as we are searching after the second to last record of the first search
      expect(secondSearch.body.hits.hits[0].sort).to.be.below(cursor); // below since we are paging backwards in time
    });

    it(`${superUser.username} should allow cardinality aggs in ${SPACE1}/${SECURITY_SOLUTION_ALERT_INDEX}`, async () => {
      const found = await supertestWithoutAuth
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}/find`)
        .auth(superUser.username, superUser.password)
        .set('kbn-xsrf', 'true')
        .send({
          size: 1,
          aggs: {
            nbr_consumer: {
              cardinality: {
                field: 'kibana.alert.rule.consumer',
              },
            },
          },
          index: '.alerts*',
        });
      expect(found.statusCode).to.eql(200);
      expect(found.body.aggregations.nbr_consumer.value).to.be.equal(2);
    });

    function addTests({ space, authorizedUsers, unauthorizedUsers, alertId, index }: TestCase) {
      authorizedUsers.forEach(({ username, password }) => {
        it(`${username} should finds alerts which match query in ${space}/${index}`, async () => {
          const found = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}/find`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({
              query: { match: { [ALERT_WORKFLOW_STATUS]: 'open' } },
              index,
            });
          expect(found.statusCode).to.eql(200);
          expect(found.body.hits.total.value).to.be.above(0);
        });
      });

      unauthorizedUsers.forEach(({ username, password }) => {
        it(`${username} should NOT be able to find alert ${alertId} in ${space}/${index}`, async () => {
          const res = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}/find`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .send({
              query: { term: { _id: alertId } },
              index,
            });
          expect([403, 404, 200]).to.contain(res.statusCode);
          if (res.statusCode === 200) {
            expect(res.body.hits.hits.length).to.eql(0);
          }
        });
      });
    }

    // Alert - Update - RBAC - spaces Security Solution superuser should bulk update alerts which match query in space1/.alerts-security.alerts
    // Alert - Update - RBAC - spaces superuser should bulk update alert with given id 020202 in space1/.alerts-security.alerts
    describe('Security Solution', () => {
      const authorizedInAllSpaces = [superUser, globalRead, secOnlySpacesAll, obsSecSpacesAll];
      const authorizedOnlyInSpace1 = [secOnly, secOnlyRead, obsSecRead, obsSec];
      const authorizedOnlyInSpace2 = [
        secOnlyReadSpace2,
        obsSecReadSpace2,
        secOnlySpace2,
        obsSecAllSpace2,
      ];
      const unauthorized = [
        // these users are not authorized to get alerts for the Security Solution in any space
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
      const authorizedInAllSpaces = [superUser, globalRead, obsOnlySpacesAll, obsSecSpacesAll];
      const authorizedOnlyInSpace1 = [obsOnly, obsSec, obsOnlyRead, obsSecRead];
      const authorizedOnlyInSpace2 = [
        obsOnlySpace2,
        obsSecReadSpace2,
        obsOnlyReadSpace2,
        obsSecAllSpace2,
      ];
      const unauthorized = [
        // these users are not authorized to update alerts for APM in any space
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
