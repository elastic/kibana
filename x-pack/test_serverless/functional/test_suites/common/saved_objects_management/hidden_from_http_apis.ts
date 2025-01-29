/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import expect from '@kbn/expect';
import type { Response } from 'supertest';
import { SavedObject } from '@kbn/core/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

interface MinimalSO {
  id: string;
  type: string;
}

function parseNdJson(input: string): Array<SavedObject<any>> {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'savedObjects']);
  const supertest = getService('supertest');
  const kbnServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const testSubjects = getService('testSubjects');

  describe('types with `hiddenFromHttpApis` ', () => {
    before(async () => {
      await kbnServer.savedObjects.cleanStandardList();
      await kbnServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/saved_objects_management/hidden_from_http_apis'
      );
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-objects');
      await pageObjects.savedObjects.waitTableIsLoaded();
    });

    after(async () => {
      // We cannot use `kbnServer.importExport.unload` to clean up test fixtures.
      // `kbnServer.importExport.unload` uses the global SOM `delete` HTTP API
      // and will throw on `hiddenFromHttpApis:true` objects
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/hidden_from_http_apis'
      );
    });

    describe('APIS', () => {
      const hiddenFromHttpApisType = {
        type: 'test-hidden-from-http-apis-importable-exportable',
        id: 'hidden-from-http-apis-1',
      };
      const notHiddenFromHttpApisType = {
        type: 'test-not-hidden-from-http-apis-importable-exportable',
        id: 'not-hidden-from-http-apis-1',
      };

      describe('_bulk_get', () => {
        describe('saved objects with hiddenFromHttpApis type', () => {
          const URL = '/api/kibana/management/saved_objects/_bulk_get';

          it('should return 200 for types that are not hidden from the http apis', async () =>
            await supertest
              .post(URL)
              .send([notHiddenFromHttpApisType])
              .set(svlCommonApi.getCommonRequestHeader())
              .set(svlCommonApi.getInternalRequestHeader())
              .expect(200)
              .then((response: Response) => {
                expect(response.body).to.have.length(1);
                const { type, id, meta, error } = response.body[0];
                expect(type).to.eql(notHiddenFromHttpApisType.type);
                expect(id).to.eql(notHiddenFromHttpApisType.id);
                expect(meta).to.not.equal(undefined);
                expect(error).to.equal(undefined);
              }));

          it('should return 200 for types that are hidden from the http apis', async () =>
            await supertest
              .post(URL)
              .send([hiddenFromHttpApisType])
              .set(svlCommonApi.getCommonRequestHeader())
              .set(svlCommonApi.getInternalRequestHeader())
              .expect(200)
              .then((response: Response) => {
                expect(response.body).to.have.length(1);
                const { type, id, meta, error } = response.body[0];
                expect(type).to.eql(hiddenFromHttpApisType.type);
                expect(id).to.eql(hiddenFromHttpApisType.id);
                expect(meta).to.not.equal(undefined);
                expect(error).to.equal(undefined);
              }));

          it('should return 200 for a mix of types', async () =>
            await supertest
              .post(URL)
              .send([hiddenFromHttpApisType, notHiddenFromHttpApisType])
              .set(svlCommonApi.getCommonRequestHeader())
              .set(svlCommonApi.getInternalRequestHeader())
              .expect(200)
              .expect(200)
              .then((response: Response) => {
                expect(response.body).to.have.length(2);
                const { type, id, meta, error } = response.body[0];
                expect(type).to.eql(hiddenFromHttpApisType.type);
                expect(id).to.eql(hiddenFromHttpApisType.id);
                expect(meta).to.not.equal(undefined);
                expect(error).to.equal(undefined);
              }));
        });
      });

      describe('find', () => {
        it('returns saved objects registered as hidden from the http Apis', async () => {
          await supertest
            .get(`/api/kibana/management/saved_objects/_find?type=${hiddenFromHttpApisType.type}`)
            .set(svlCommonApi.getCommonRequestHeader())
            .set(svlCommonApi.getInternalRequestHeader())
            .expect(200)
            .then((resp) => {
              expect(
                resp.body.saved_objects
                  .map((so: MinimalSO) => ({
                    id: so.id,
                    type: so.type,
                  }))
                  .sort((a: MinimalSO, b: MinimalSO) => (a.id > b.id ? 1 : -1))
              ).to.eql([
                {
                  id: 'hidden-from-http-apis-1',
                  type: 'test-hidden-from-http-apis-importable-exportable',
                },
                {
                  id: 'hidden-from-http-apis-2',
                  type: 'test-hidden-from-http-apis-importable-exportable',
                },
              ]);
            });
        });
      });

      describe('export', () => {
        it('allows to export them directly by id', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              objects: [
                {
                  type: 'test-hidden-from-http-apis-importable-exportable',
                  id: 'hidden-from-http-apis-1',
                },
              ],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              const objects = parseNdJson(resp.text);
              expect(objects.map((obj) => obj.id)).to.eql(['hidden-from-http-apis-1']);
            });
        });

        it('allows to export them directly by type', async () => {
          await supertest
            .post('/api/saved_objects/_export')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              type: ['test-hidden-from-http-apis-importable-exportable'],
              excludeExportDetails: true,
            })
            .expect(200)
            .then((resp) => {
              const objects = parseNdJson(resp.text);
              expect(objects.map((obj) => obj.id)).to.eql([
                'hidden-from-http-apis-1',
                'hidden-from-http-apis-2',
              ]);
            });
        });
      });

      describe('import', () => {
        it('allows to import them', async () => {
          await supertest
            .post('/api/saved_objects/_import')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(svlCommonApi.getInternalRequestHeader())
            .attach('file', join(__dirname, './exports/_import_hidden_from_http_apis.ndjson'))
            .expect(200)
            .then((resp) => {
              expect(resp.body).to.eql({
                success: true,
                successCount: 2,
                successResults: [
                  {
                    id: 'hidden-from-http-apis-import1',
                    meta: {
                      title: 'I am hidden from http apis but the client can still see me',
                    },
                    type: 'test-hidden-from-http-apis-importable-exportable',
                    managed: false,
                  },
                  {
                    id: 'not-hidden-from-http-apis-import1',
                    meta: {
                      title: 'I am not hidden from http apis',
                    },
                    type: 'test-not-hidden-from-http-apis-importable-exportable',
                    managed: false,
                  },
                ],
                warnings: [],
              });
            });
        });
      });
    });
  });
}
