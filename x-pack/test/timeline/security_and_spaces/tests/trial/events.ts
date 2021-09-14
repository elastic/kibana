/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import { ALERT_INSTANCE_ID, ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';

import { User } from '../../../../rule_registry/common/lib/authentication/types';
import { TimelineEdges, TimelineNonEcsData } from '../../../../../plugins/timelines/common/';
import { getSpaceUrlPrefix } from '../../../../rule_registry/common/lib/authentication/spaces';

import {
  obsMinReadAlertsRead,
  obsMinReadAlertsReadSpacesAll,
  obsMinRead,
  obsMinReadSpacesAll,
} from '../../../../rule_registry/common/lib/authentication/users';
import {
  Direction,
  TimelineEventsQueries,
} from '../../../../../plugins/security_solution/common/search_strategy';
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
}

const TO = '3000-01-01T00:00:00.000Z';
const FROM = '2000-01-01T00:00:00.000Z';
const TEST_URL = '/internal/search/timelineSearchStrategy/';
const SPACE_1 = 'space1';

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
        field: ALERT_INSTANCE_ID,
      },
      {
        field: 'event.kind',
      },
    ],
    factoryQueryType: TimelineEventsQueries.all,
    fieldRequested: ['@timestamp', 'message', ALERT_RULE_CONSUMER, ALERT_INSTANCE_ID, 'event.kind'],
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
      unauthorizedUsers,
      body,
      featureIds,
      expectedNumberAlerts,
    }: TestCase) {
      authorizedUsers.forEach(({ username, password }) => {
        it(`${username} should be able to view alerts from "${featureIds.join(',')}" ${
          space != null ? `in space ${space}` : 'when no space specified'
        }`, async () => {
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

      unauthorizedUsers.forEach(({ username, password }) => {
        it(`${username} should NOT be able to access "${featureIds.join(',')}" ${
          space != null ? `in space ${space}` : 'when no space specified'
        }`, async () => {
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
      addTests({
        space: SPACE_1,
        featureIds: ['apm'],
        expectedNumberAlerts: 2,
        body: {
          ...getPostBody(),
          defaultIndex: ['.alerts-*'],
          entityType: 'alerts',
          alertConsumers: ['apm'],
        },
        authorizedUsers: [obsMinReadAlertsRead, obsMinReadAlertsReadSpacesAll],
        unauthorizedUsers: [obsMinRead, obsMinReadSpacesAll],
      });
    });
  });
};
