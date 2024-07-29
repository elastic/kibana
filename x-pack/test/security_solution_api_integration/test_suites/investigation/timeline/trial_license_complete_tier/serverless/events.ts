/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';

import {
  Direction,
  TimelineEventsQueries,
  TimelineEventsAllStrategyResponse,
} from '@kbn/security-solution-plugin/common/search_strategy';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getFieldsToRequest, getFilterValue } from '../../../../utils';
import { RoleCredentials } from '../../../../../../../test_serverless/shared/services';

const TO = '3000-01-01T00:00:00.000Z';
const FROM = '2000-01-01T00:00:00.000Z';
// typical values that have to change after an update from "scripts/es_archiver"
const DATA_COUNT = 7;
const HOST_NAME = 'suricata-sensor-amsterdam';
const TOTAL_COUNT = 96;
const EDGE_LENGTH = 25;
const ACTIVE_PAGE = 0;
const PAGE_SIZE = 25;
const LIMITED_PAGE_SIZE = 2;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const secureBsearch = getService('secureBsearch');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  const getPostBody = (): JsonObject => ({
    defaultIndex: ['auditbeat-*'],
    factoryQueryType: TimelineEventsQueries.all,
    entityType: 'events',
    fieldRequested: getFieldsToRequest(),
    fields: [],
    filterQuery: getFilterValue(HOST_NAME, FROM, TO),
    pagination: {
      activePage: 0,
      querySize: 25,
    },
    language: 'kuery',
    sort: [
      {
        field: '@timestamp',
        direction: Direction.desc,
        esTypes: ['date'],
      },
    ],
    timerange: {
      from: FROM,
      to: TO,
      interval: '12h',
    },
  });

  describe('Timeline', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns Timeline data', async () => {
      const timeline = await secureBsearch.send<TimelineEventsAllStrategyResponse>({
        supertestWithoutAuth,
        apiKeyHeader: roleAuthc.apiKeyHeader,
        internalOrigin: 'Kibana',
        options: {
          ...getPostBody(),
        },
        strategy: 'timelineSearchStrategy',
      });

      expect(timeline.edges.length).to.be(EDGE_LENGTH);
      expect(timeline.edges[0].node.data.length).to.be(DATA_COUNT);
      expect(timeline.totalCount).to.be(TOTAL_COUNT);
      expect(timeline.pageInfo.activePage).to.equal(ACTIVE_PAGE);
      expect(timeline.pageInfo.querySize).to.equal(PAGE_SIZE);
    });

    it('returns paginated Timeline query', async () => {
      const timeline = await secureBsearch.send<TimelineEventsAllStrategyResponse>({
        supertestWithoutAuth,
        apiKeyHeader: roleAuthc.apiKeyHeader,
        internalOrigin: 'Kibana',
        options: {
          ...getPostBody(),
          pagination: {
            activePage: 0,
            querySize: LIMITED_PAGE_SIZE,
          },
        },
        strategy: 'timelineSearchStrategy',
      });
      expect(timeline.edges.length).to.be(LIMITED_PAGE_SIZE);
      expect(timeline.edges[0].node.data.length).to.be(DATA_COUNT);
      expect(timeline.totalCount).to.be(TOTAL_COUNT);
      expect(timeline.edges[0].node.data.length).to.be(DATA_COUNT);
      expect(timeline.edges[0]!.node.ecs.host!.name).to.eql([HOST_NAME]);
    });
  });
}
