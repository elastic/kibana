/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { AlertData } from '../../../../../plugins/security_solution/common/endpoint_alerts/types';
import { eventsIndexPattern } from '../../../../../plugins/security_solution/common/endpoint/constants';
import {
  deleteEventsStream,
  deleteMetadataStream,
  deletePolicyStream,
} from '../data_stream_helper';
import { indexHostsAndAlerts } from '../../../../../plugins/security_solution/common/endpoint/index_data';

/**
 * The number of alert documents in the es archive.
 */
const numberOfHosts = 3;
const numberOfAlertsPerHost = 4;
const numberOfAlertsInFixture = numberOfHosts * numberOfAlertsPerHost;

/**
 * The default number of entries returned when no page_size is specified.
 */
const defaultPageSize = 10;

/**
 * `NULLABLE_EVENT_FIELD` should be a field in the fixture that exists for some alerts,
 * but not all.
 *
 * This allows us to test sorting and paging on mixed data that may or may not exist
 * for each alert.
 */
const NULLABLE_EVENT_FIELD = 'process.parent.entity_id';

/**
 * An Elasticsearch query to get the alert (or alerts) without `NULLABLE_EVENT_FIELD`.
 */
const ES_QUERY_MISSING = {
  query: {
    bool: {
      must: [
        {
          bool: {
            must_not: {
              exists: {
                field: NULLABLE_EVENT_FIELD,
              },
            },
          },
        },
        {
          term: {
            'event.kind': {
              value: 'alert',
            },
          },
        },
      ],
    },
  },
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const client = getService('es');
  const nextPrevPrefixQuery = "query=(language:kuery,query:'')";
  const nextPrevPrefixDateRange = "date_range=(from:'2018-01-10T00:00:00.000Z',to:now)";
  const nextPrevPrefixSort = 'sort=@timestamp';
  const nextPrevPrefixOrder = 'order=desc';
  const nextPrevPrefixPageSize = 'page_size=10';
  const nextPrevPrefix = `${nextPrevPrefixQuery}&${nextPrevPrefixDateRange}&${nextPrevPrefixSort}&${nextPrevPrefixOrder}&${nextPrevPrefixPageSize}`;

  let nullableEventId = '';

  describe('Endpoint alert API', () => {
    describe('when data is in elasticsearch', () => {
      before(async () => {
        await indexHostsAndAlerts(
          client,
          'alerts-seed',
          numberOfHosts,
          1,
          'metrics-endpoint.metadata-default-1',
          'metrics-endpoint.policy-default-1',
          'events-endpoint-1',
          numberOfAlertsPerHost
        );

        const res = await es.search({
          index: eventsIndexPattern,
          body: ES_QUERY_MISSING,
        });
        nullableEventId = res.hits.hits[0]._source.event.id;
      });

      after(async () => {
        // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
        // to do it manually
        await Promise.all([
          deleteEventsStream(getService),
          deleteMetadataStream(getService),
          deletePolicyStream(getService),
        ]);
      });

      it('should not support POST requests', async () => {
        await supertest.post('/api/endpoint/alerts').send({}).set('kbn-xsrf', 'xxx').expect(404);
      });

      it('should return one entry for each alert with default paging', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(numberOfAlertsInFixture);
        expect(body.alerts.length).to.eql(defaultPageSize);
        expect(body.request_page_size).to.eql(defaultPageSize);
        /**
         * No page_index was specified. It should return page 0.
         */
        expect(body.request_page_index).to.eql(0);
        /**
         * The total offset: page_index * page_size
         */
        expect(body.result_from_index).to.eql(0);
      });

      it('should return the page_size and page_index specified in the query params', async () => {
        const pageSize = 1;
        const pageIndex = 1;
        const { body } = await supertest
          .get(`/api/endpoint/alerts?page_size=${pageSize}&page_index=${pageIndex}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(numberOfAlertsInFixture);
        /**
         * Skipping the first page (with a size of 1).
         */
        const expectedToBeSkipped = 1;
        expect(body.alerts.length).to.eql(pageSize);
        expect(body.request_page_size).to.eql(pageSize);
        expect(body.request_page_index).to.eql(pageIndex);
        expect(body.result_from_index).to.eql(expectedToBeSkipped);
      });

      describe('when the query params specify a page_index and page_size that return no results', () => {
        let body: any;
        const requestPageSize = 100;
        const requestPageIndex = 3;
        beforeEach(async () => {
          const response = await supertest
            .get(`/api/endpoint/alerts?page_size=${requestPageSize}&page_index=${requestPageIndex}`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          body = response.body;
        });
        it('should return accurate total counts', async () => {
          expect(body.total).to.eql(numberOfAlertsInFixture);
          /**
           * Nothing was returned due to pagination.
           */
          expect(body.alerts.length).to.eql(0);
          expect(body.request_page_size).to.eql(requestPageSize);
          expect(body.request_page_index).to.eql(requestPageIndex);
          expect(body.result_from_index).to.eql(requestPageIndex * requestPageSize);
        });
      });

      it('should return 400 when paging properties are less than 1', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_size=0')
          .set('kbn-xsrf', 'xxx')
          .expect(400);
        expect(body.message).to.contain('Value must be equal to or greater than [1]');
      });

      it('should return working link to the next page using cursor-based pagination', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_index=0')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(defaultPageSize);
        const lastTimestampFirstPage = body.alerts[9]['@timestamp'];
        const lastEventIdFirstPage = body.alerts[9].event.id;
        expect(body.next).to.eql(
          `/api/endpoint/alerts?${nextPrevPrefix}&after=${lastTimestampFirstPage}&after=${lastEventIdFirstPage}`
        );

        const { body: nextBody } = await supertest
          .get(body.next)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(nextBody.alerts.length).to.eql(2);
        const firstTimestampNextPage = nextBody.alerts[0]['@timestamp'];
        const firstEventIdNextPage = nextBody.alerts[0].event.id;
        expect(nextBody.prev).to.eql(
          `/api/endpoint/alerts?${nextPrevPrefix}&before=${firstTimestampNextPage}&before=${firstEventIdNextPage}`
        );
      });

      it('should return working link to the prev page using cursor-based pagination', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_index=1')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(2);
        const firstTimestamp = body.alerts[0]['@timestamp'];
        const firstEventId = body.alerts[0].event.id;
        expect(body.prev).to.eql(
          `/api/endpoint/alerts?${nextPrevPrefix}&before=${firstTimestamp}&before=${firstEventId}`
        );

        const { body: prevBody } = await supertest
          .get(body.prev)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(prevBody.alerts.length).to.eql(10);
        const lastTimestampFirstPage = prevBody.alerts[9]['@timestamp'];
        const lastEventIdFirstPage = prevBody.alerts[9].event.id;
        expect(prevBody.next).to.eql(
          `/api/endpoint/alerts?${nextPrevPrefix}&after=${lastTimestampFirstPage}&after=${lastEventIdFirstPage}`
        );
      });

      it('should return no results when `before` is requested past beginning of first page', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const { body: emptyBody } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefix}&before=${
              body.alerts[0]['@timestamp'] + 1
            }&before=5ff1a4ec-758e-49e7-89aa-2c6821fe6b54`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(emptyBody.alerts.length).to.eql(0);
      });

      it('should return no results when `after` is requested past end of last page, descending', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_index=1')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const { body: emptyBody } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefix}&after=${
              body.alerts[1]['@timestamp'] - 1
            }&after=6d75d498-3cca-45ad-a304-525b95ae0412`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(emptyBody.alerts.length).to.eql(0);
      });

      it('alerts api should return data using `before` by custom sort parameter, descending', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&${nextPrevPrefixOrder}&sort=process.name&before=malware%20writer&before=4d7afd81-26ec-47c0-9741-ae16d331f73d`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        let valid: boolean = true;
        (body.alerts as AlertData[]).forEach((alert) => {
          if (alert.process?.name > 'malware writer') {
            valid = false;
          }
        });
        expect(valid).to.eql(true);
      });

      it('alerts api should return data using `before` on undefined primary sort values by custom sort parameter, descending', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&order=desc&sort=${NULLABLE_EVENT_FIELD}&before=&before=${nullableEventId}&empty_string_is_undefined=true`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        let lastSeen: string | undefined = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
        let valid: boolean = true;

        for (const alert of body.alerts) {
          const entityId = alert.process?.parent?.entity_id;
          if (entityId === undefined && alert.event.id > nullableEventId) {
            valid = false;
          }
          if (entityId !== undefined && lastSeen !== undefined && entityId > lastSeen) {
            valid = false;
          } else {
            lastSeen = entityId;
          }
        }

        expect(valid).to.eql(true);
      });

      it('alerts api should return data using `before` on undefined primary sort values by custom sort parameter, ascending', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&page_size=25&order=asc&sort=${NULLABLE_EVENT_FIELD}&before=&before=${nullableEventId}&empty_string_is_undefined=true`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        let lastSeen: string | undefined = '1';
        let valid: boolean = true;

        for (const alert of body.alerts) {
          const entityId = alert.process?.parent?.entity_id;
          if (entityId === undefined && alert.event.id < nullableEventId) {
            valid = false;
          }
          if (entityId !== undefined && lastSeen !== undefined && entityId < lastSeen) {
            valid = false;
          } else {
            lastSeen = entityId;
          }
        }
        expect(valid).to.eql(true);
      });

      it('should return data using `after` by custom sort parameter, descending', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&${nextPrevPrefixOrder}&sort=process.pid&after=3&after=66008e21-2493-4b15-a937-939ea228064a`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        expect(body.alerts[0].process.pid).to.eql(2);
      });

      it('alerts api should return data using `after` on undefined primary sort values by custom sort parameter, descending', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&sort=${NULLABLE_EVENT_FIELD}&order=desc&after=&after=${nullableEventId}&empty_string_is_undefined=true`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        let lastSeen: string | undefined = 'zzzzzzzzzzzzzzzzzzzzzzzzzzz';
        let valid: boolean = true;

        for (const alert of body.alerts) {
          const entityId = alert.process?.parent?.entity_id;
          if (entityId === undefined && alert.event.id < nullableEventId) {
            valid = false;
          }
          if (entityId !== undefined && lastSeen !== undefined && entityId > lastSeen) {
            valid = false;
          } else {
            lastSeen = entityId;
          }
        }
        expect(valid).to.eql(true);
      });

      it('alerts api should return data using `after` on undefined primary sort values by custom sort parameter, ascending', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&sort=${NULLABLE_EVENT_FIELD}&order=asc&after=&after=${nullableEventId}&empty_string_is_undefined=true`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        let lastSeen: string | undefined = '1';
        let valid: boolean = true;

        for (const alert of body.alerts) {
          const entityId = alert.process?.parent?.entity_id;
          if (entityId === undefined && alert.event.id < nullableEventId) {
            valid = false;
          }
          if (entityId !== undefined && lastSeen !== undefined && entityId < lastSeen) {
            valid = false;
          } else {
            lastSeen = entityId;
          }
        }
        expect(valid).to.eql(true);
      });

      it('should filter results of alert data using rison-encoded filters', async () => {
        const { body: firstBody } = await supertest
          .get('/api/endpoint/alerts?page_index=0')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const hostname = firstBody.alerts[0].host.hostname;
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?filters=!((%27%24state%27%3A(store%3AappState)%2Cmeta%3A(alias%3A!n%2Cdisabled%3A!f%2Ckey%3Ahost.hostname%2Cnegate%3A!f%2Cparams%3A(query%3A${hostname})%2Ctype%3Aphrase)%2Cquery%3A(match_phrase%3A(host.hostname%3A${hostname}))))`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(4);
        expect(body.alerts.length).to.eql(4);
        expect(body.request_page_size).to.eql(defaultPageSize);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('should filter results of alert data using KQL', async () => {
        const { body: firstBody } = await supertest
          .get('/api/endpoint/alerts?page_index=0')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const agentID = firstBody.alerts[0].agent.id;
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?query=(language%3Akuery%2Cquery%3A%27agent.id%20%3A%20"${agentID}"%27)`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(4);
        expect(body.alerts.length).to.eql(4);
        expect(body.request_page_size).to.eql(defaultPageSize);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('should return 400 when alert id is not valid', async () => {
        await supertest
          .get('/api/endpoint/alerts/does-not-exist')
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });
    });
  });
}
