/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import { ALERT_UUID, ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';

import { TimelineEdges, TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import {
  Direction,
  TimelineEventsQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { User } from '../../../../rule_registry/common/lib/authentication/types';
import { getSpaceUrlPrefix } from '../../../../rule_registry/common/lib/authentication/spaces';

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
} from '../../../../rule_registry/common/lib/authentication/users';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

interface TestCase {
  /** The space where the alert exists */
  space?: string;
  /** The ID of the solution for which to get alerts */
  featureIds: string[];
  /** The total alerts expected to be returned */
  expectedNumberAlerts: number;
  /** body to be posted */
  body: JsonObject;
  /** Authorized users */
  authorizedUsers: User[];
  /** Unauthorized users */
  unauthorizedUsers: User[];
  /** Users who are authorized for one, but not all of the alert solutions being queried */
  usersWithoutAllPrivileges?: User[];
}

const TO = '3000-01-01T00:00:00.000Z';
const FROM = '2000-01-01T00:00:00.000Z';
const TEST_URL = '/internal/search/timelineSearchStrategy/';
const SPACE_1 = 'space1';
const SPACE_2 = 'space2';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const getPostBody = (): JsonObject => ({
    defaultIndex: ['.alerts-*'],
    entityType: 'alerts',
    docValueFields: [
      {
        field: '@timestamp',
      },
      {
        field: ALERT_RULE_CONSUMER,
      },
      {
        field: ALERT_UUID,
      },
      {
        field: 'event.kind',
      },
    ],
    factoryQueryType: TimelineEventsQueries.all,
    fieldRequested: ['@timestamp', 'message', ALERT_RULE_CONSUMER, ALERT_UUID, 'event.kind'],
    fields: [],
    filterQuery: {
      bool: {
        filter: [
          {
            match_all: {},
          },
        ],
      },
    },
    pagination: {
      activePage: 0,
      querySize: 25,
    },
    language: 'kuery',
    sort: [
      {
        field: '@timestamp',
        direction: Direction.desc,
        type: 'number',
      },
    ],
    timerange: {
      from: FROM,
      to: TO,
      interval: '12h',
    },
  });

  describe('Timeline - Events', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    function addTests({
      space,
      authorizedUsers,
      usersWithoutAllPrivileges,
      unauthorizedUsers,
      body,
      featureIds,
      expectedNumberAlerts,
    }: TestCase) {
      authorizedUsers.forEach(({ username, password }) => {
        it(`${username} should be able to view alerts from "${featureIds.join(',')}" ${
          space != null ? `in space ${space}` : 'when no space specified'
        }`, async () => {
          // This will be flake until it uses the bsearch service, but these tests aren't operational. Once you do make this operational
          // use const bsearch = getService('bsearch');
          const resp = await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .set('Content-Type', 'application/json')
            .send({ ...body })
            .expect(200);

          const timeline = resp.body;

          expect(
            timeline.edges.every((hit: TimelineEdges) => {
              const data: TimelineNonEcsData[] = hit.node.data;
              return data.some(({ field, value }) => {
                return (
                  field === ALERT_RULE_CONSUMER && featureIds.includes((value && value[0]) ?? '')
                );
              });
            })
          ).to.equal(true);
          expect(timeline.totalCount).to.be(expectedNumberAlerts);
        });
      });

      if (usersWithoutAllPrivileges != null) {
        usersWithoutAllPrivileges.forEach(({ username, password }) => {
          it(`${username} should NOT be able to view alerts from "${featureIds.join(',')}" ${
            space != null ? `in space ${space}` : 'when no space specified'
          }`, async () => {
            // This will be flake until it uses the bsearch service, but these tests aren't operational. Once you do make this operational
            // use const bsearch = getService('bsearch');
            const resp = await supertestWithoutAuth
              .post(`${getSpaceUrlPrefix(space)}${TEST_URL}`)
              .auth(username, password)
              .set('kbn-xsrf', 'true')
              .set('Content-Type', 'application/json')
              .send({ ...body })
              .expect(200);

            const timeline = resp.body;

            expect(timeline.totalCount).to.be(0);
          });
        });
      }

      unauthorizedUsers.forEach(({ username, password }) => {
        it(`${username} should NOT be able to access "${featureIds.join(',')}" ${
          space != null ? `in space ${space}` : 'when no space specified'
        }`, async () => {
          // This will be flake until it uses the bsearch service, but these tests aren't operational. Once you do make this operational
          // use const bsearch = getService('bsearch');
          await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix(space)}${TEST_URL}`)
            .auth(username, password)
            .set('kbn-xsrf', 'true')
            .set('Content-Type', 'application/json')
            .send({ ...body })
            // TODO - This should be updated to be a 403 once this ticket is resolved
            // https://github.com/elastic/kibana/issues/106005
            .expect(500);
        });
      });
    }

    describe('alerts authentication', () => {
      const authorizedSecSpace1 = [secOnly, secOnlyRead];
      const authorizedObsSpace1 = [obsOnly, obsOnlyRead];
      const authorizedSecObsSpace1 = [obsSec, obsSecRead];

      const authorizedSecSpace2 = [secOnlySpace2, secOnlyReadSpace2];
      const authorizedObsSpace2 = [obsOnlySpace2, obsOnlyReadSpace2];
      const authorizedSecObsSpace2 = [obsSecAllSpace2, obsSecReadSpace2];

      const authorizedSecInAllSpaces = [secOnlySpacesAll];
      const authorizedObsInAllSpaces = [obsOnlySpacesAll];
      const authorizedSecObsInAllSpaces = [obsSecSpacesAll];

      const authorizedInAllSpaces = [superUser, globalRead];
      const unauthorized = [noKibanaPrivileges];

      describe('Querying for Security Solution alerts only', () => {
        addTests({
          space: SPACE_1,
          featureIds: ['siem'],
          expectedNumberAlerts: 2,
          body: {
            ...getPostBody(),
            defaultIndex: ['.alerts-*'],
            entityType: 'alerts',
            alertConsumers: ['siem'],
          },
          authorizedUsers: [
            ...authorizedSecSpace1,
            ...authorizedSecObsSpace1,
            ...authorizedSecInAllSpaces,
            ...authorizedSecObsInAllSpaces,
            ...authorizedInAllSpaces,
          ],
          usersWithoutAllPrivileges: [...authorizedObsSpace1, ...authorizedObsInAllSpaces],
          unauthorizedUsers: [
            ...authorizedSecSpace2,
            ...authorizedObsSpace2,
            ...authorizedSecObsSpace2,
            ...unauthorized,
          ],
        });

        addTests({
          space: SPACE_2,
          featureIds: ['siem'],
          expectedNumberAlerts: 2,
          body: {
            ...getPostBody(),
            alertConsumers: ['siem'],
          },
          authorizedUsers: [
            ...authorizedSecSpace2,
            ...authorizedSecObsSpace2,
            ...authorizedSecInAllSpaces,
            ...authorizedSecObsInAllSpaces,
            ...authorizedInAllSpaces,
          ],
          usersWithoutAllPrivileges: [...authorizedObsSpace2, ...authorizedObsInAllSpaces],
          unauthorizedUsers: [
            ...authorizedSecSpace1,
            ...authorizedObsSpace1,
            ...authorizedSecObsSpace1,
            ...unauthorized,
          ],
        });
      });

      describe('Querying for APM alerts only', () => {
        addTests({
          space: SPACE_1,
          featureIds: ['apm'],
          expectedNumberAlerts: 2,
          body: {
            ...getPostBody(),
            alertConsumers: ['apm'],
          },
          authorizedUsers: [
            ...authorizedObsSpace1,
            ...authorizedSecObsSpace1,
            ...authorizedObsInAllSpaces,
            ...authorizedSecObsInAllSpaces,
            ...authorizedInAllSpaces,
          ],
          usersWithoutAllPrivileges: [...authorizedSecSpace1, ...authorizedSecInAllSpaces],
          unauthorizedUsers: [
            ...authorizedSecSpace2,
            ...authorizedObsSpace2,
            ...authorizedSecObsSpace2,
            ...unauthorized,
          ],
        });
        addTests({
          space: SPACE_2,
          featureIds: ['apm'],
          expectedNumberAlerts: 2,
          body: {
            ...getPostBody(),
            alertConsumers: ['apm'],
          },
          authorizedUsers: [
            ...authorizedObsSpace2,
            ...authorizedSecObsSpace2,
            ...authorizedObsInAllSpaces,
            ...authorizedSecObsInAllSpaces,
            ...authorizedInAllSpaces,
          ],
          usersWithoutAllPrivileges: [...authorizedSecSpace2, ...authorizedSecInAllSpaces],
          unauthorizedUsers: [
            ...authorizedSecSpace1,
            ...authorizedObsSpace1,
            ...authorizedSecObsSpace1,
            ...unauthorized,
          ],
        });
      });

      describe('Querying for multiple solutions', () => {
        describe('authorized for both security solution and apm', () => {
          addTests({
            space: SPACE_1,
            featureIds: ['siem', 'apm'],
            expectedNumberAlerts: 4,
            body: {
              ...getPostBody(),
              defaultIndex: ['.alerts-*'],
              entityType: 'alerts',
              alertConsumers: ['siem', 'apm'],
            },
            authorizedUsers: [
              ...authorizedSecObsSpace1,
              ...authorizedSecObsInAllSpaces,
              ...authorizedInAllSpaces,
            ],
            unauthorizedUsers: [...unauthorized],
          });
          addTests({
            space: SPACE_2,
            featureIds: ['siem', 'apm'],
            expectedNumberAlerts: 4,
            body: {
              ...getPostBody(),
              defaultIndex: ['.alerts-*'],
              entityType: 'alerts',
              alertConsumers: ['siem', 'apm'],
            },
            authorizedUsers: [
              ...authorizedSecObsSpace2,
              ...authorizedSecObsInAllSpaces,
              ...authorizedInAllSpaces,
            ],
            unauthorizedUsers: [...unauthorized],
          });
        });
        describe('security solution privileges only', () => {
          addTests({
            space: SPACE_1,
            featureIds: ['siem'],
            expectedNumberAlerts: 2,
            body: {
              ...getPostBody(),
              defaultIndex: ['.alerts-*'],
              entityType: 'alerts',
              alertConsumers: ['siem', 'apm'],
            },
            authorizedUsers: [...authorizedSecInAllSpaces],
            unauthorizedUsers: [...unauthorized],
          });
        });

        describe('apm privileges only', () => {
          addTests({
            space: SPACE_1,
            featureIds: ['apm'],
            expectedNumberAlerts: 2,
            body: {
              ...getPostBody(),
              defaultIndex: ['.alerts-*'],
              entityType: 'alerts',
              alertConsumers: ['siem', 'apm'],
            },
            authorizedUsers: [...authorizedObsInAllSpaces],
            unauthorizedUsers: [...unauthorized],
          });
        });

        describe('querying from default space when no alerts were created in default space', () => {
          addTests({
            featureIds: ['siem'],
            expectedNumberAlerts: 0,
            body: {
              ...getPostBody(),
              defaultIndex: ['.alerts-*'],
              entityType: 'alerts',
              alertConsumers: ['siem', 'apm'],
            },
            authorizedUsers: [...authorizedSecInAllSpaces],
            unauthorizedUsers: [...unauthorized],
          });
        });
      });
    });
  });
};
