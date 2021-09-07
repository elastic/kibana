/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { ALERT_INSTANCE_ID, ALERT_RULE_CONSUMER } from '@kbn/rule-data-utils';

import { getSpaceUrlPrefix } from '../../../../rule_registry/common/lib/authentication/spaces';

import {
  superUser,
  globalRead,
  secOnly,
  secOnlyRead,
  noKibanaPrivileges,
} from '../../../../rule_registry/common/lib/authentication/users';
import {
  Direction,
  TimelineEventsQueries,
} from '../../../../../plugins/security_solution/common/search_strategy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

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

    const authorizedSecSpace1 = [secOnly, secOnlyRead];
    const authorizedInAllSpaces = [superUser, globalRead];
    const unauthorized = [noKibanaPrivileges];

    [...authorizedSecSpace1, ...authorizedInAllSpaces].forEach(({ username, password }) => {
      it(`${username} - should return a 404 when accessing a spaces route`, async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix(SPACE_1)}${TEST_URL}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('Content-Type', 'application/json')
          .send({
            ...getPostBody(),
            defaultIndex: ['.alerts-*'],
            entityType: 'alerts',
            alertConsumers: ['siem'],
          })
          .expect(404);
      });
    });

    [...authorizedInAllSpaces].forEach(({ username, password }) => {
      it(`${username} - should return 200 for authorized users`, async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('Content-Type', 'application/json')
          .send({
            ...getPostBody(),
            alertConsumers: ['siem', 'apm'],
          })
          .expect(200);
      });
    });

    [...unauthorized].forEach(({ username, password }) => {
      it(`${username} - should return 403 for unauthorized users`, async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix()}${TEST_URL}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('Content-Type', 'application/json')
          .send({
            ...getPostBody(),
            alertConsumers: ['siem', 'apm'],
          })
          // TODO - This should be updated to be a 403 once this ticket is resolved
          // https://github.com/elastic/kibana/issues/106005
          .expect(500);
      });
    });
  });
};
