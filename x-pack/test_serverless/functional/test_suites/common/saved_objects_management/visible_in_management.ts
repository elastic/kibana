/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'path';
import expect from '@kbn/expect';
import type { Response } from 'supertest';
import { SavedObject } from '@kbn/core/server';
import type { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/common/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

function parseNdJson(input: string): Array<SavedObject<any>> {
  return input.split('\n').map((str) => JSON.parse(str));
}

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'svlCommonPage', 'savedObjects']);
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');
  const testSubjects = getService('testSubjects');

  describe('types with `visibleInManagement` ', () => {
    before(async () => {
      await esArchiver.load(
        'test/functional/fixtures/es_archiver/saved_objects_management/visible_in_management'
      );
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-objects');
      await pageObjects.savedObjects.waitTableIsLoaded();
    });

    after(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/visible_in_management'
      );
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
                type: 'test-not-visible-in-management',
                id: 'vim-1',
              },
            ],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => obj.id)).to.eql(['vim-1']);
          });
      });

      it('allows to export them directly by type', async () => {
        await supertest
          .post('/api/saved_objects/_export')
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .send({
            type: ['test-not-visible-in-management'],
            excludeExportDetails: true,
          })
          .expect(200)
          .then((resp) => {
            const objects = parseNdJson(resp.text);
            expect(objects.map((obj) => obj.id)).to.eql(['vim-1']);
          });
      });
    });

    describe('import', () => {
      it('allows to import them', async () => {
        await supertest
          .post('/api/saved_objects/_import')
          .set(svlCommonApi.getCommonRequestHeader())
          .set(svlCommonApi.getInternalRequestHeader())
          .attach('file', join(__dirname, './exports/_import_non_visible_in_management.ndjson'))
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({
              success: true,
              successCount: 1,
              successResults: [
                {
                  id: 'ff3773b0-9ate-11e7-ahb3-3dcb94193fab',
                  meta: {
                    title: 'Saved object type that is not visible in management',
                  },
                  type: 'test-not-visible-in-management',
                  managed: false,
                },
              ],
              warnings: [],
            });
          });
      });
    });

    describe('savedObjects management APIS', () => {
      describe('GET /api/kibana/management/saved_objects/_allowed_types', () => {
        let types: SavedObjectManagementTypeInfo[];

        before(async () => {
          await supertest
            .get('/api/kibana/management/saved_objects/_allowed_types')
            .set(svlCommonApi.getCommonRequestHeader())
            .set(svlCommonApi.getInternalRequestHeader())
            .expect(200)
            .then((response: Response) => {
              types = response.body.types as SavedObjectManagementTypeInfo[];
            });
        });

        it('should only return types that are `visibleInManagement: true`', () => {
          const typeNames = types.map((type) => type.name);

          expect(typeNames.includes('test-is-exportable')).to.eql(true);
          expect(typeNames.includes('test-visible-in-management')).to.eql(true);
          expect(typeNames.includes('test-not-visible-in-management')).to.eql(false);
        });

        it('should return displayName for types specifying it', () => {
          const typeWithDisplayName = types.find((type) => type.name === 'test-with-display-name');
          expect(typeWithDisplayName !== undefined).to.eql(true);
          expect(typeWithDisplayName!.displayName).to.eql('my display name');

          const typeWithoutDisplayName = types.find(
            (type) => type.name === 'test-visible-in-management'
          );
          expect(typeWithoutDisplayName !== undefined).to.eql(true);
          expect(typeWithoutDisplayName!.displayName).to.eql('test-visible-in-management');
        });
      });
    });
  });
}
