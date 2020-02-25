/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('test alerts api', () => {
    describe('Tests for alerts API', () => {
      before(() => esArchiver.load('endpoint/alerts/api_feature'));
      after(() => esArchiver.unload('endpoint/alerts/api_feature'));
      it('alerts api should return one entry for each alert with default paging', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(10);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('alerts api should return page based on paging properties passed.', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_size=1&page_index=1')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(1);
        expect(body.request_page_size).to.eql(1);
        expect(body.request_page_index).to.eql(1);
        expect(body.result_from_index).to.eql(1);
      });

      it('alerts api should return accurate total alerts if page index produces no result', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_size=100&page_index=3')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(0);
        expect(body.request_page_size).to.eql(100);
        expect(body.request_page_index).to.eql(3);
        expect(body.result_from_index).to.eql(300);
      });

      it('alerts api should return 400 when paging properties are below boundaries.', async () => {
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_size=0')
          .set('kbn-xsrf', 'xxx')
          .expect(400);
        expect(body.message).to.contain('Value is [0] but it must be equal to or greater than [1]');
      });

      it('alerts api should return `prev` and `next` using `after` and `before`.', async () => {
        const prefix =
          "date_range=(from:'2018-01-10T00:00:00.000Z',to:now)&sort=@timestamp&order=desc&page_size=10";
        const { body } = await supertest
          .get('/api/endpoint/alerts?page_index=0')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        const lastTimestampFirstPage = body.alerts[9]['@timestamp'];
        const lastEventIdFirstPage = body.alerts[9].event.id;
        expect(body.next).to.eql(
          `/api/endpoint/alerts?${prefix}&after=${lastTimestampFirstPage}&after=${lastEventIdFirstPage}`
        );
      });

      it('alerts api should return data using `next`', async () => {
        const prefix =
          "date_range=(from:'2018-01-10T00:00:00.000Z',to:now)&sort=@timestamp&order=desc&page_size=10";
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${prefix}&after=1542789412000&after=c710bf2d-8686-4038-a2a1-43bdecc06b2a`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        const firstTimestampNextPage = body.alerts[0]['@timestamp'];
        const firstEventIdNextPage = body.alerts[0].event.id;
        expect(body.prev).to.eql(
          `/api/endpoint/alerts?${prefix}&before=${firstTimestampNextPage}&before=${firstEventIdNextPage}`
        );
      });

      it('alerts api should return data using `prev`', async () => {
        const prefix =
          "date_range=(from:'2018-01-10T00:00:00.000Z',to:now)&sort=@timestamp&order=desc&page_size=10";
        const { body } = await supertest
          .get(
            `/api/endpoint/alerts?${prefix}&before=1542789412000&before=823d814d-fa0c-4e53-a94c-f6b296bb965b`
          )
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
      });

      it('alerts api should return alert details by id', async () => {});

      it('alerts api should return data using `next` by custom sort parameter', async () => {});

      it('alerts api should filter results of alert data', async () => {});
    });
  });
}
