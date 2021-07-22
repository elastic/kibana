/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { superUser } from '../../../rule_registry/common/lib/authentication/users';
import type { User } from '../../../rule_registry/common/lib/authentication/types';
import { FtrProviderContext } from '../../../rule_registry/common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../rule_registry/common/lib/authentication/spaces';
import {
  Direction,
  TimelineEventsQueries,
} from '../../../../plugins/security_solution/common/search_strategy';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const TO = '3000-01-01T00:00:00.000Z';
  const FROM = '2000-01-01T00:00:00.000Z';
  const TEST_URL = '/internal/search/timelineSearchStrategy/';
  const SPACE1 = 'space1';
  const SPACE2 = 'space2';
  const OTHER = 'other';

  const getPostBody = (): JsonObject => ({
    defaultIndex: ['.alerts-*'],
    entityType: 'alerts',
    docValueFields: [
      {
        field: '@timestamp',
      },
      {
        field: 'kibana.rac.alert.owner',
      },
      {
        field: 'kibana.rac.alert.id',
      },
      {
        field: 'event.kind',
      },
    ],
    factoryQueryType: TimelineEventsQueries.all,
    fieldRequested: [
      '@timestamp',
      'message',
      'kibana.rac.alert.owner',
      'kibana.rac.alert.id',
      'event.kind',
    ],
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

    it('should handle alerts request appropriately', async () => {
      const resp = await supertest
        .post(`${getSpaceUrlPrefix(SPACE1)}${TEST_URL}`)
        .set('kbn-xsrf', 'true')
        .set('Content-Type', 'application/json')
        .send({
          ...getPostBody(),
          alertConsumers: ['siem', 'apm'],
        })
        .expect(200);

      // there's 4 total alerts, one is assigned to space2 only
      expect(resp.body.totalCount).to.be(3);
    });

    it('should not return alerts from another space', async () => {
      const resp = await supertest
        .post(`${getSpaceUrlPrefix(OTHER)}${TEST_URL}`)
        .set('kbn-xsrf', 'true')
        .set('Content-Type', 'application/json')
        .send({
          ...getPostBody(),
          alertConsumers: ['siem', 'apm'],
        })
        .expect(200);

      expect(resp.body.totalCount).to.be(0);
    });
  });
};
