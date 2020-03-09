/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { stringify } from 'query-string';
import { FtrProviderContext } from '../../ftr_provider_context';

import { BASE_ALERTS_ROUTE } from '../../../../plugins/endpoint/server/routes/alerts';
import { AlertListRequestQuery } from '../../../../plugins/endpoint/server/routes/alerts/types';

function buildUrl(id: string | null, params: AlertListRequestQuery): string {
  return `${BASE_ALERTS_ROUTE}${id !== null ? '/' + id : ''}?${stringify(params)}`;
}

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('test alerts api', () => {
    describe('Tests for alerts API', () => {
      before(() => esArchiver.load('endpoint/alerts/api_feature'));
      after(() => esArchiver.unload('endpoint/alerts/api_feature'));

      it('alerts api should not support post', async () => {
        await supertest
          .post(buildUrl(null, {}))
          .send({})
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });

      it('alerts api should return one entry for each alert with default paging', async () => {
        const { body } = await supertest
          .get(buildUrl(null, {}))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(10);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('alerts api should return page based on paging properties passed.', async () => {
        const args: AlertListRequestQuery = {
          page_size: 1,
          page_index: 1,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(1);
        expect(body.request_page_size).to.eql(1);
        expect(body.request_page_index).to.eql(1);
        expect(body.result_from_index).to.eql(1);
      });

      it('alerts api should return accurate total alerts if page index produces no result', async () => {
        const args: AlertListRequestQuery = {
          page_size: 100,
          page_index: 3,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(0);
        expect(body.request_page_size).to.eql(100);
        expect(body.request_page_index).to.eql(3);
        expect(body.result_from_index).to.eql(300);
      });

      it('alerts api should return 400 when paging properties are below boundaries.', async () => {
        const args: AlertListRequestQuery = {
          page_size: 0,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(400);
        expect(body.message).to.contain('Value must be equal to or greater than [1]');
      });

      it('alerts api should return links to the next and previous pages using cursor-based pagination', async () => {
        const args: AlertListRequestQuery = {
          page_index: 0,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        const lastTimestampFirstPage = body.alerts[9]['@timestamp'];
        const lastEventIdFirstPage = body.alerts[9].event.id;
        expect(body.next).to.contain(
          `after=${lastTimestampFirstPage}&after=${lastEventIdFirstPage}`
        );
      });

      it('alerts api should return data using `next` link', async () => {
        const args: AlertListRequestQuery = {
          after: ['1542789412000', 'c710bf2d-8686-4038-a2a1-43bdecc06b2a'],
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        const firstTimestampNextPage = body.alerts[0]['@timestamp'];
        const firstEventIdNextPage = body.alerts[0].event.id;
        expect(body.prev).to.contain(
          `before=${firstTimestampNextPage}&before=${firstEventIdNextPage}`
        );
      });

      it('alerts api should return data using `prev` link', async () => {
        const args: AlertListRequestQuery = {
          before: ['1542789412000', '823d814d-fa0c-4e53-a94c-f6b296bb965b'],
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
      });

      it('alerts api should return no results when `before` is requested past beginning of first page', async () => {
        const args: AlertListRequestQuery = {
          before: ['1542789473000', 'ffae628e-6236-45ce-ba24-7351e0af219e'],
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(0);
      });

      it('alerts api should return no results when `after` is requested past end of last page, descending', async () => {
        const args: AlertListRequestQuery = {
          order: 'desc',
          after: ['1542341895000', '01911945-48aa-478e-9712-f49c92a15f20'],
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(0);
      });

      it('alerts api should return data using `before` by custom sort parameter, descending', async () => {
        const args: AlertListRequestQuery = {
          order: 'desc',
          sort: 'thread.id',
          before: ['2824', 'dfa9e94e-0b59-4180-a8cf-cd8a2339ba36'],
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        expect(body.alerts[0].thread?.id).to.eql(undefined);
        expect(body.alerts[9].thread?.id).to.eql(undefined);
      });

      it('alerts api should return data using `before` on undefined primary sort values by custom sort parameter, descending', async () => {
        const args: AlertListRequestQuery = {
          order: 'desc',
          sort: 'thread.id',
          before: ['', '0b07c8a7-3b23-4458-9884-ee44243c2590'],
          empty_string_is_undefined: true,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        expect(body.alerts[0].thread?.id).to.eql(undefined);
        expect(body.alerts[9].thread?.id).to.eql(undefined);
        expect(body.alerts[9].event?.id).to.eql('162e48bf-80fe-4235-8bb4-814984db0d83');
      });

      it('alerts api should return data using `before` on undefined primary sort values by custom sort parameter, ascending', async () => {
        const args: AlertListRequestQuery = {
          page_size: 25,
          order: 'asc',
          sort: 'thread.id',
          before: ['', 'd4693a89-506e-4c0f-a66f-cda355de7301'],
          empty_string_is_undefined: true,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(25);
        expect(body.alerts[0].thread?.id).to.eql(1872);
        expect(body.alerts[24].thread?.id).to.eql(undefined);
      });

      it('alerts api should return data using `after` by custom sort parameter, descending', async () => {
        const args: AlertListRequestQuery = {
          sort: 'thread.id',
          order: 'desc',
          after: ['2180', '8362fcde-0b10-476f-97a8-8d6a43865226'],
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        expect(body.alerts[0].thread.id).to.eql(1912);
      });

      it('alerts api should return data using `after` on undefined primary sort values by custom sort parameter, descending', async () => {
        const args: AlertListRequestQuery = {
          sort: 'thread.id',
          order: 'desc',
          after: ['', '162e48bf-80fe-4235-8bb4-814984db0d83'],
          empty_string_is_undefined: true,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(10);
        expect(body.alerts[0].thread?.id).to.eql(undefined);
        expect(body.alerts[2].thread?.id).to.eql(2824);
      });

      it('alerts api should return data using `after` on undefined primary sort values by custom sort parameter, ascending', async () => {
        const args: AlertListRequestQuery = {
          sort: 'thread.id',
          order: 'asc',
          after: ['', 'b5b16e38-371d-43af-bd35-72da230cbde5'],
          empty_string_is_undefined: true,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.alerts.length).to.eql(1);
        expect(body.alerts[0].thread?.id).to.eql(undefined);
      });

      it('alerts api should filter results of alert data using rison-encoded filters', async () => {
        const args: AlertListRequestQuery = {
          filters: `!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:host.hostname,negate:!f,params:(query:HD-m3z-4c803698),type:phrase),query:(match_phrase:(host.hostname:HD-m3z-4c803698))))`,
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(72);
        expect(body.alerts.length).to.eql(10);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('alerts api should filter results of alert data using KQL', async () => {
        const args: AlertListRequestQuery = {
          query: 'agent.id:c89dc040-2350-4d59-baea-9ff2e369136f',
        };
        const { body } = await supertest
          .get(buildUrl(null, args))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.total).to.eql(72);
        expect(body.alerts.length).to.eql(10);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('alerts api should return alert details by id', async () => {
        const { body } = await supertest
          .get(buildUrl('YjUYMHABAJk0XnHd6bqU', {}))
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.id).to.eql('YjUYMHABAJk0XnHd6bqU');
        expect(body.next).to.eql(null); // last alert, no more beyond this
        expect(body.prev).to.eql('/api/endpoint/alerts/XjUYMHABAJk0XnHd6boX');
      });

      it('alerts api should return 404 when alert is not found', async () => {
        await supertest
          .get(buildUrl('does-not-exist', {}))
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });
    });
  });
}
