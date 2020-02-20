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
  describe('test endpoints api', () => {
    describe('POST /api/endpoint/endpoints when index is empty', () => {
      it('endpoints api should return empty result when index is empty', async () => {
        await esArchiver.unload('endpoint/endpoints/api_feature');
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(0);
        expect(body.endpoints.length).to.eql(0);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });
    });

    describe('POST /api/endpoint/endpoints when index is not empty', () => {
      before(() => esArchiver.load('endpoint/endpoints/api_feature'));
      after(() => esArchiver.unload('endpoint/endpoints/api_feature'));
      it('endpoints api should return one entry for each endpoint with default paging', async () => {
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(3);
        expect(body.endpoints.length).to.eql(3);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('endpoints api should return page based on paging properties passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 1,
              },
              {
                page_index: 1,
              },
            ],
          })
          .expect(200);
        expect(body.total).to.eql(3);
        expect(body.endpoints.length).to.eql(1);
        expect(body.request_page_size).to.eql(1);
        expect(body.request_page_index).to.eql(1);
      });

      /* test that when paging properties produces no result, the total should reflect the actual number of endpoints
      in the index.
       */
      it('endpoints api should return accurate total endpoints if page index produces no result', async () => {
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 10,
              },
              {
                page_index: 3,
              },
            ],
          })
          .expect(200);
        expect(body.total).to.eql(3);
        expect(body.endpoints.length).to.eql(0);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(30);
      });

      it('endpoints api should return 400 when pagingProperties is below boundaries.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 0,
              },
              {
                page_index: 1,
              },
            ],
          })
          .expect(400);
        expect(body.message).to.contain('Value is [0] but it must be equal to or greater than [1]');
      });

      it('endpoints api should return page based on filters passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send({ filter: 'not host.ip:10.101.149.26' })
          .expect(200);
        expect(body.total).to.eql(2);
        expect(body.endpoints.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('endpoints api should return page based on filters and paging passed.', async () => {
        const notIncludedIp = '10.101.149.26';
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 10,
              },
              {
                page_index: 0,
              },
            ],
            filter: `not host.ip:${notIncludedIp}`,
          })
          .expect(200);
        expect(body.total).to.eql(2);
        const resultIps: string[] = [].concat(
          ...body.endpoints.map((metadata: Record<string, any>) => metadata.host.ip)
        );
        expect(resultIps).to.eql(['10.192.213.130', '10.70.28.129', '10.46.229.234']);
        expect(resultIps).not.include.eql(notIncludedIp);
        expect(body.endpoints.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('endpoints api should return page based on host.os.variant filter.', async () => {
        const variantValue = 'Windows Pro';
        const { body } = await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send({
            filter: `host.os.variant.keyword:${variantValue}`,
          })
          .expect(200);
        expect(body.total).to.eql(2);
        const resultOsVariantValue: Set<string> = new Set(
          body.endpoints.map((metadata: Record<string, any>) => metadata.host.os.variant)
        );
        expect(Array.from(resultOsVariantValue)).to.eql([variantValue]);
        expect(body.endpoints.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });
    });
  });
}
