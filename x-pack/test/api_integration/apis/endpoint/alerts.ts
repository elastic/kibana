/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

/**
 * The number of alert documents in the es archive.
 */
const numberOfAlertsInFixture = 12;

/**
 * The default number of entries returned when no page_size is specified.
 */
const defaultPageSize = 10;

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const nextPrevPrefixQuery = "query=(language:kuery,query:'')";
  const nextPrevPrefixDateRange = "date_range=(from:'2018-01-10T00:00:00.000Z',to:now)";
  const nextPrevPrefixSort = 'sort=@timestamp';
  const nextPrevPrefixOrder = 'order=desc';
  const nextPrevPrefixPageSize = 'page_size=10';
  const nextPrevPrefix = `${nextPrevPrefixQuery}&${nextPrevPrefixDateRange}&${nextPrevPrefixSort}&${nextPrevPrefixOrder}&${nextPrevPrefixPageSize}`;

  describe('Endpoint alert API', () => {
    describe('when data is in elasticsearch', () => {
      before(() => esArchiver.load('endpoint/alerts/api_feature'));
      after(() => esArchiver.unload('endpoint/alerts/api_feature'));

      it('should not support POST requests', async () => {
        await supertest
          .post('/api/endpoint/alerts')
          .send({})
          .set('kbn-xsrf', 'xxx')
          .expect(404);
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

      it('should return links to the next and previous pages using cursor-based pagination', async () => {
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
      });

      it('should return data using `next` link', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefix}&after=1584044338719&after=66008e21-2493-4b15-a937-939ea228064a`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(defaultPageSize);
        const firstTimestampNextPage = body.alerts[0]['@timestamp'];
        const firstEventIdNextPage = body.alerts[0].event.id;
        expect(body.prev).to.eql(
          `/api/endpoint/alerts?${nextPrevPrefix}&before=${firstTimestampNextPage}&before=${firstEventIdNextPage}`
        );
      });

      it('should return data using `prev` link', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefix}&before=1542789412000&before=823d814d-fa0c-4e53-a94c-f6b296bb965b`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
      });

      it('should return no results when `before` is requested past beginning of first page', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefix}&before=1584044338726&before=5ff1a4ec-758e-49e7-89aa-2c6821fe6b54`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(0);
      });

      it('should return no results when `after` is requested past end of last page', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefix}&after=1584044338612&after=6d75d498-3cca-45ad-a304-525b95ae0412`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(0);
      });

      it('should return 400 when using `before` by custom sort parameter', async () => {
        await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&${nextPrevPrefixOrder}&sort=process.pid&before=1&before=66008e21-2493-4b15-a937-939ea228064a`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });

      it('should return data using `after` by custom sort parameter', async () => {
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${nextPrevPrefixDateRange}&${nextPrevPrefixPageSize}&${nextPrevPrefixOrder}&sort=process.pid&after=3&after=66008e21-2493-4b15-a937-939ea228064a`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        expect(body.alerts[0].process.pid).to.eql(2);
      });

      it('should filter results of alert data using rison-encoded filters', async () => {
        const hostname = 'Host-abmfhmc5ku';
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
        const agentID = '7cf9f7a3-28a6-4d1e-bb45-005aa28f18d0';
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

      it('should return alert details by id', async () => {
        const documentID = 'zbNm0HABdD75WLjLYgcB';
        const prevDocumentID = '2rNm0HABdD75WLjLYgcU';
        const { body } = await supertest
          .get(`/api/endpoint/alerts/${documentID}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.id).to.eql(documentID);
        expect(body.prev).to.eql(`/api/endpoint/alerts/${prevDocumentID}`);
        expect(body.next).to.eql(null); // last alert, no more beyond this
      });

      it('should return 404 when alert is not found', async () => {
        await supertest
          .get('/api/endpoint/alerts/does-not-exist')
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });
    });
  });
}
