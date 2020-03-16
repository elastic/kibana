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

  const sizeOfFixture: number = 1;

  describe('test whitelist api', () => {
    describe('Tests for whitelist API', () => {
      beforeEach(() => esArchiver.load('endpoint/whitelist/api_feature'));
      afterEach(() => esArchiver.unload('endpoint/whitelist/api_feature'));

      it('should return whitelist rules when the GET method is called', async () => {
        const resp = await supertest.get('/api/endpoint/whitelist').set('kbn-xsrf', 'xxx');
        expect(resp.statusCode).to.equal(200);
        const responseBody = JSON.parse(resp.text);
        expect(responseBody.entries.length).to.equal(sizeOfFixture);
      });

      it('should return the whitelist manifest when the GET method is called', async () => {
        const resp = await supertest.get('/api/endpoint/manifest').set('kbn-xsrf', 'xxx');
        expect(resp.statusCode).to.equal(200);
        const responseBody = JSON.parse(resp.text);
        const cachedWhitelist = responseBody.artifacts['global-whitelist'];
        // expect(cachedWhitelist.size).to.equal(sizeOfFixture);  // TODO fix me
        expect(cachedWhitelist.encoding).to.equal('xz');
        expect(cachedWhitelist.url).to.contain(cachedWhitelist.sha256);
      });

      it('should respond with a bad request if an invalid whitelist hash is given for download', async () => {
        const resp = await supertest
          .get('/api/endpoint/whitelist/download/1a2b3c4d5e6') // A fake hash
          .set('kbn-xsrf', 'xxx');
        expect(resp.statusCode).to.equal(400);
      });

      it('should insert a whilelist rule into elasticsearch properly', async () => {
        let whitelistManifestSize: number = 0;
        let whitelistHash: string = '';
        await supertest
          .post('/api/endpoint/whitelist')
          .set('kbn-xsrf', 'xxx')
          .send({ event_types: ['processEvent', 'malware'], file_path: 'you havent seen yet' })
          .then(function(res: { statusCode: any; text: string }) {
            expect(res.statusCode).to.equal(200);
            const responseBody = JSON.parse(res.text);
            expect(responseBody.length).to.equal(1);
          })
          .then(async function() {
            await supertest
              .get('/api/endpoint/whitelist')
              .set('kbn-xsrf', 'xxx')
              .then(function(getResp: { text: string }) {
                const getRespBody = JSON.parse(getResp.text);
                expect(getRespBody.entries.length).to.equal(sizeOfFixture + 1);
              });
          })
          .then(async function() {
            await supertest
              .get('/api/endpoint/manifest')
              .set('kbn-xsrf', 'xxx')
              .then(function(manifestResp: { text: string }) {
                const manifest = JSON.parse(manifestResp.text);
                const whitelist = manifest.artifacts['global-whitelist'];
                whitelistManifestSize = whitelist.size;
                whitelistHash = whitelist.sha256;
                expect(whitelistManifestSize).to.greaterThan(0);
                expect(whitelist.encoding).to.equal('xz');
                expect(whitelist.url).to.contain(whitelist.sha256);
              });
          })
          .then(async function() {
            await supertest
              .get(`/api/endpoint/whitelist/download/${whitelistHash}`)
              .set('kbn-xsrf', 'xxx')
              .then(function(downloadResp) {
                const dl: Buffer = downloadResp.body;
                // TODO
                // expect(downloadResp.headers['content-encoding']).to.equal('xz');
                // The content-length header should equal the length of the body which should equal
                // to the size in the manifest from before.
                expect(downloadResp.statusCode).to.equal(200);
                expect(+downloadResp.headers['content-length']).to.equal(dl.length);
                expect(dl.length).to.equal(whitelistManifestSize);
              });
          });
      });

      it('should insert multiple whilelist rules into elasticsearch from a single request properly', async () => {
        await supertest
          .post('/api/endpoint/whitelist')
          .set('kbn-xsrf', 'xxx')
          .send({
            event_types: ['malware'],
            file_path: 'you havent seen yet',
            signer: 'Microsoft',
            sha256: 'somesha256hash',
          })
          .then(function(res: { statusCode: any; text: string }) {
            expect(res.statusCode).to.equal(200);
            const responseBody = JSON.parse(res.text);
            expect(responseBody.length).to.equal(3);
          })
          .then(async function() {
            await supertest
              .get('/api/endpoint/whitelist')
              .set('kbn-xsrf', 'xxx')
              .then(function(getResp: { text: string }) {
                const getRespBody = JSON.parse(getResp.text);
                expect(getRespBody.entries.length).to.equal(sizeOfFixture + 3);
              });
          });
      });

      it('should insert a whilelist rule with unicode into elasticsearch properly', async () => {
        await supertest
          .post('/api/endpoint/whitelist')
          .set('kbn-xsrf', 'xxx')
          .send({
            event_types: ['processEvent', 'mȀlware'],
            file_path: 'C://ɚɚɚ/ȄȄȄȄ',
            comment: 'LGTM 👍',
          })
          .then(function(res: { statusCode: any; text: string }) {
            expect(res.statusCode).to.equal(200);
            const responseBody = JSON.parse(res.text);
            expect(responseBody.length).to.equal(1);
          });
      });

      it('should delete a whitelist rule properly', async () => {
        let createdID: string = '';
        await supertest
          .post('/api/endpoint/whitelist') // Creates a rule
          .set('kbn-xsrf', 'xxx')
          .send({
            event_types: ['malware'],
            sha256: 'somesha256hash',
          })
          .then(function(res: { statusCode: any; text: string }) {
            expect(res.statusCode).to.equal(200);
            const responseBody = JSON.parse(res.text);
            expect(responseBody.length).to.equal(1);
            createdID = responseBody[0].id;
          })
          .then(async function() {
            await supertest
              .delete('/api/endpoint/whitelist') // Deletes a rule
              .set('kbn-xsrf', 'xxx')
              .send({
                whitelist_id: createdID,
              })
              .then(function(delResp) {
                expect(delResp.statusCode).to.equal(200);
              });
          })
          .then(async function() {
            await supertest
              .get('/api/endpoint/whitelist') // Checks that the rule was deleted
              .set('kbn-xsrf', 'xxx')
              .then(function(getResp) {
                const getRespBody = JSON.parse(getResp.text);
                expect(getResp.statusCode).to.equal(200);
                expect(getRespBody.entries.length).to.equal(sizeOfFixture);
              });
          });
      });

      it('should handle a request to delete a whitelist rule that does not exist', async () => {
        await supertest
          .delete('/api/endpoint/whitelist')
          .set('kbn-xsrf', 'xxx')
          .send({
            whitelist_id: 'xyz2345', // does not exist
          })
          .then(function(delResp) {
            expect(delResp.statusCode).to.equal(400);
          });
      });
    });
  });
}
