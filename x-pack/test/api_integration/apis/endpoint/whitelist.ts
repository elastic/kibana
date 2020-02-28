/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { Client } from 'elasticsearch';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es: Client = getService('legacyEs');

  const nextPrevPrefixDateRange = "date_range=(from:'2018-01-10T00:00:00.000Z',to:now)";
  const nextPrevPrefixSort = 'sort=@timestamp';
  const nextPrevPrefixOrder = 'order=desc';
  const nextPrevPrefixPageSize = 'page_size=10';
  const nextPrevPrefix = `${nextPrevPrefixDateRange}&${nextPrevPrefixSort}&${nextPrevPrefixOrder}&${nextPrevPrefixPageSize}`;

  const sizeOfFixture: number = 1;

  describe('test whitelist api', () => {
    describe('Tests for whitelist API', () => {
      beforeEach(() => esArchiver.load('endpoint/whitelist/api_feature'));
      afterEach(() => esArchiver.unload('endpoint/whitelist/api_feature'));

      it('should return whitelist rules when the GET method is called', async () => {
        const resp = await supertest.get('/api/endpoint/whitelist').set('kbn-xsrf', 'xxx');

        expect(resp.statusCode).to.equal(200);
        const responseBody = JSON.parse(resp.text);
        expect(responseBody.length).to.equal(sizeOfFixture);
      });

      it('should insert a whilelist rule into elasticsearch properly', async () => {
        await supertest
          .post('/api/endpoint/whitelist')
          .set('kbn-xsrf', 'xxx')
          .send({ alert_id: '123', file_path: 'you havent seen yet' })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            const responseBody = JSON.parse(res.text);
            expect(responseBody.length).to.equal(1);
          })
          .then(async function(resp) {
            await supertest
              .get('/api/endpoint/whitelist')
              .set('kbn-xsrf', 'xxx')
              .then(function(getResp) {
                const getRespBody = JSON.parse(getResp.text);
                expect(getRespBody.length).to.equal(sizeOfFixture + 1);
              });
          });
      });

      it('should insert multiple whilelist rules into elasticsearch from a single request properly', async () => {
        await supertest
          .post('/api/endpoint/whitelist')
          .set('kbn-xsrf', 'xxx')
          .send({
            alert_id: '123',
            file_path: 'you havent seen yet',
            signer: 'Microsoft',
            sha256: 'somesha256hash',
          })
          .then(function(res) {
            expect(res.statusCode).to.equal(200);
            const responseBody = JSON.parse(res.text);
            expect(responseBody.length).to.equal(3);
          })
          .then(async function(res) {
            await supertest
              .get('/api/endpoint/whitelist')
              .set('kbn-xsrf', 'xxx')
              .then(function(res) {
                const getResp = JSON.parse(res.text);
                expect(getResp.length).to.equal(sizeOfFixture + 3);
              });
          });
      });
    });
  });
}
