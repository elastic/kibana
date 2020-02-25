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
          .post('/api/endpoint/alerts')
          .set('kbn-xsrf', 'xxx')
          .send({})
          .expect(200);
        expect(body.total).to.eql(132);
        expect(body.alerts.length).to.eql(10);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
        expect(body.result_from_index).to.eql(0);
      });

      it('alerts api should return page based on paging properties passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/alerts')
          .set('kbn-xsrf', 'xxx')
          .send({
            page_size: 1,
            page_index: 1,
          })
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
    });
  });
}
