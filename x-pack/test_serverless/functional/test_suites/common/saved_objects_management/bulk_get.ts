/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Response } from 'supertest';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'savedObjects']);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const svlCommonApi = getService('svlCommonApi');
  const testSubjects = getService('testSubjects');

  describe('_bulk_get', () => {
    describe('saved objects with hidden type', () => {
      before(async () => {
        await esArchiver.load(
          'test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
        );
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/saved_objects_management/hidden_saved_objects'
        );
        await pageObjects.svlCommonPage.loginAsAdmin();
        await pageObjects.common.navigateToApp('management');
        await testSubjects.click('app-card-objects');
        await pageObjects.savedObjects.waitTableIsLoaded();
      });

      after(async () => {
        await esArchiver.unload(
          'test/functional/fixtures/es_archiver/saved_objects_management/hidden_saved_objects'
        );
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/saved_objects_management/hidden_saved_objects'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });

      const URL = '/api/kibana/management/saved_objects/_bulk_get';
      const hiddenTypeExportableImportable = {
        type: 'test-hidden-importable-exportable',
        id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
      };
      const hiddenTypeNonExportableImportable = {
        type: 'test-hidden-non-importable-exportable',
        id: 'op3767a1-9rcg-53u7-jkb3-3dnb74193awc',
      };

      function expectSuccess(index: number, { body }: Response) {
        const { type, id, meta, error } = body[index];
        expect(type).to.eql(hiddenTypeExportableImportable.type);
        expect(id).to.eql(hiddenTypeExportableImportable.id);
        expect(meta).to.not.equal(undefined);
        expect(error).to.equal(undefined);
      }

      function expectBadRequest(index: number, { body }: Response) {
        const { type, id, error } = body[index];
        expect(type).to.eql(hiddenTypeNonExportableImportable.type);
        expect(id).to.eql(hiddenTypeNonExportableImportable.id);
        expect(error).to.eql({
          message: `Unsupported saved object type: '${hiddenTypeNonExportableImportable.type}': Bad Request`,
          statusCode: 400,
          error: 'Bad Request',
        });
      }

      it('should return 200 for hidden types that are importableAndExportable', async () =>
        await supertest
          .post(URL)
          .send([hiddenTypeExportableImportable])
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(200)
          .then((response: Response) => {
            expect(response.body).to.have.length(1);
            expectSuccess(0, response);
          }));

      it('should return error for hidden types that are not importableAndExportable', async () =>
        await supertest
          .post(URL)
          .send([hiddenTypeNonExportableImportable])
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(200)
          .then((response: Response) => {
            expect(response.body).to.have.length(1);
            expectBadRequest(0, response);
          }));

      it('should return mix of successes and errors', async () =>
        await supertest
          .post(URL)
          .send([hiddenTypeExportableImportable, hiddenTypeNonExportableImportable])
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(200)
          .then((response: Response) => {
            expect(response.body).to.have.length(2);
            expectSuccess(0, response);
            expectBadRequest(1, response);
          }));
    });
  });
}
