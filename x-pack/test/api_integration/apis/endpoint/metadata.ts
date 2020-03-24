/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

/**
 * The number of host documents in the es archive.
 */
const numberOfHostsInFixture = 3;

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('test metadata api', () => {
    describe('POST /api/endpoint/metadata when index is empty', () => {
      it('metadata api should return empty result when index is empty', async () => {
        await esArchiver.unload('endpoint/metadata/api_feature');
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(0);
        expect(body.hosts.length).to.eql(0);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });
    });

    describe('POST /api/endpoint/metadata when index is not empty', () => {
      before(() => esArchiver.load('endpoint/metadata/api_feature'));
      after(() => esArchiver.unload('endpoint/metadata/api_feature'));
      it('metadata api should return one entry for each host with default paging', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(numberOfHostsInFixture);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return page based on paging properties passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
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
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(1);
        expect(body.request_page_index).to.eql(1);
      });

      /* test that when paging properties produces no result, the total should reflect the actual number of metadata
      in the index.
       */
      it('metadata api should return accurate total metadata if page index produces no result', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
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
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(0);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(30);
      });

      it('metadata api should return 400 when pagingProperties is below boundaries.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
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
        expect(body.message).to.contain('Value must be equal to or greater than [1]');
      });

      it('metadata api should return page based on filters passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({ filter: 'not host.ip:10.100.170.247' })
          .expect(200);
        expect(body.total).to.eql(2);
        expect(body.hosts.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return page based on filters and paging passed.', async () => {
        const notIncludedIp = '10.100.170.247';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
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
          ...body.hosts.map((metadata: Record<string, any>) => metadata.host.ip)
        );
        expect(resultIps).to.eql([
          '10.48.181.222',
          '10.116.62.62',
          '10.102.83.30',
          '10.198.70.21',
          '10.252.10.66',
          '10.128.235.38',
        ]);
        expect(resultIps).not.include.eql(notIncludedIp);
        expect(body.hosts.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return page based on host.os.variant filter.', async () => {
        const variantValue = 'Windows Pro';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filter: `host.os.variant.keyword:${variantValue}`,
          })
          .expect(200);
        expect(body.total).to.eql(1);
        const resultOsVariantValue: Set<string> = new Set(
          body.hosts.map((metadata: Record<string, any>) => metadata.host.os.variant)
        );
        expect(Array.from(resultOsVariantValue)).to.eql([variantValue]);
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return the latest event for all the events for an endpoint', async () => {
        const targetEndpointIp = '10.100.170.247';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filter: `host.ip:${targetEndpointIp}`,
          })
          .expect(200);
        expect(body.total).to.eql(1);
        const resultIp: string = body.hosts[0].host.ip.filter(
          (ip: string) => ip === targetEndpointIp
        );
        expect(resultIp).to.eql([targetEndpointIp]);
        expect(body.hosts[0].event.created).to.eql(1584044335459);
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return all hosts when filter is empty string', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filter: '',
          })
          .expect(200);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(numberOfHostsInFixture);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });
    });
  });
}
