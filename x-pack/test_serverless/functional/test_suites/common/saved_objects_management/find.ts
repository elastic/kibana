/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'savedObjects']);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const svlCommonApi = getService('svlCommonApi');
  const testSubjects = getService('testSubjects');

  describe('find', () => {
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
        // emptyKibanaIndex fails in Serverless with
        // "index_not_found_exception: no such index [.kibana_ingest]",
        // so it was switched to `savedObjects.cleanStandardList()
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('returns saved objects with importableAndExportable types', async () =>
        await supertest
          .get('/api/kibana/management/saved_objects/_find?type=test-hidden-importable-exportable')
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(200)
          .then((resp) => {
            expect(
              resp.body.saved_objects.map((so: { id: string; type: string }) => ({
                id: so.id,
                type: so.type,
              }))
            ).to.eql([
              {
                type: 'test-hidden-importable-exportable',
                id: 'ff3733a0-9fty-11e7-ahb3-3dcb94193fab',
              },
            ]);
          }));

      it('returns empty response for non importableAndExportable types', async () =>
        await supertest
          .get(
            '/api/kibana/management/saved_objects/_find?type=test-hidden-non-importable-exportable'
          )
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .expect(200)
          .then((resp) => {
            expect(resp.body.saved_objects).to.eql([]);
          }));
    });
  });
}
