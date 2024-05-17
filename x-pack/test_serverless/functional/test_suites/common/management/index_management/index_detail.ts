/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const log = getService('log');
  const es = getService('es');
  const testIndexName = 'index-overview-test';

  // default values
  let deletedDocs = 0;
  let totalStorageSize = '0KB';

  describe('Index Details ', function () {
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();
    });
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the indices tab
      await pageObjects.indexManagement.changeTabs('indicesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('renders the indices tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/indices`);
    });
    describe('renders initial state of index details page', () => {
      before(async () => {
        log.debug(`[Setup] Creating index`);
        try {
          // delete index - for prevent failure while creating index
          await es.indices.delete({
            index: testIndexName,
            ignore_unavailable: true,
          });
          // create index
          await es.indices.create({
            index: testIndexName,
            body: {
              mappings: {
                properties: {
                  name: {
                    type: 'text',
                  },
                },
              },
            },
          });
        } catch (e) {
          log.debug(`[Setup error] Error creating or cat request of index - ${testIndexName}`);
          throw e;
        }
      });
      after(async () => {
        try {
          // delete index
          await es.indices.delete({
            index: testIndexName,
            ignore_unavailable: true,
          });
        } catch (e) {
          log.debug(`[Setup error] Error deleting index - ${testIndexName}`);
          throw e;
        }
      });
      it('index with no documents', async () => {
        await pageObjects.indexManagement.indexDetailsPage.openIndexDetailsPage(0);
        await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
        await pageObjects.indexManagement.indexDetailsPage.storageCardDoesNotExist();
        await pageObjects.indexManagement.indexDetailsPage.expectStartIngestingDataSectionToExist();
      });
    });

    describe('renders overview page with expected deleted document count & total size', () => {
      before(async () => {
        log.debug(`[Setup] Adding document to index`);
        try {
          // delete index - for prevent failure while creating index
          await es.indices.delete({
            index: testIndexName,
            ignore_unavailable: true,
          });
          // Add  documents
          await es.bulk({
            refresh: true,
            index: testIndexName,
            operations: [
              { index: { _index: `${testIndexName}` } },
              { name: 'Jon' },
              { index: { _index: `${testIndexName}` } },
              { name: 'Smith' },
            ],
          });

          // get deleted docs  & dataset size
          const response = await Promise.all([es.cat.indices({ format: 'json' })]);

          const catResponse =
            Object.keys(response).length > 0 ? Object.assign({}, ...response[0]) : undefined;
          deletedDocs =
            catResponse !== undefined &&
            Object.keys(catResponse).includes('docs.deleted') &&
            catResponse['docs.deleted'];
          totalStorageSize =
            catResponse !== undefined &&
            Object.keys(catResponse).includes('dataset.size') &&
            catResponse['dataset.size'].toString().toUpperCase();
        } catch (e) {
          log.debug(
            `[Setup error] Error adding documents to index - ${testIndexName} or cat request`
          );
          throw e;
        }
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the indices tab
        await pageObjects.indexManagement.changeTabs('indicesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
      after(async () => {
        try {
          await es.indices.delete({
            index: testIndexName,
            ignore_unavailable: true,
          });
        } catch (e) {
          log.debug(`[Setup error] Error deleting index - ${testIndexName}`);
          throw e;
        }
      });

      it('matches total size value and deleted document count 0', async () => {
        await pageObjects.indexManagement.indexDetailsPage.openIndexDetailsPage(0);
        await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
        await pageObjects.indexManagement.indexDetailsPage.storageCardExist();
        await pageObjects.indexManagement.indexDetailsPage.expectTotalDatasetSizeToMatch(
          totalStorageSize
        );
      });
    });
    describe('index with deleted documents', () => {
      let totalDocumentCount = 0;
      before(async () => {
        log.debug(`[Setup] Delete a document from index`);

        try {
          await es.indices.delete({
            index: testIndexName,
            ignore_unavailable: true,
          });
          await es.bulk({
            refresh: true,
            index: testIndexName,
            operations: [
              { index: { _index: `${testIndexName}` } },
              { name: 'Jon' },
              { index: { _index: `${testIndexName}` } },
              { name: 'Smith' },
            ],
          });
          const res = await es.search({
            index: testIndexName,
          });
          // delete a document
          for (const hit of res.hits.hits) {
            await es.delete({
              refresh: true,
              id: hit._id,
              index: testIndexName,
            });
            break;
          }
          // get deleted docs  & dataset size
          const response = await Promise.all([es.cat.indices({ format: 'json' })]);

          const catResponse =
            Object.keys(response).length > 0 ? Object.assign({}, ...response[0]) : undefined;
          deletedDocs =
            catResponse !== undefined &&
            Object.keys(catResponse).includes('docs.deleted') &&
            catResponse['docs.deleted'];
          totalStorageSize =
            catResponse !== undefined &&
            Object.keys(catResponse).includes('dataset.size') &&
            catResponse['dataset.size'].toString().toUpperCase();
          totalDocumentCount = (await es.count({ index: testIndexName }))?.count;
        } catch (e) {
          log.debug(
            `[Setup error] Error deleting document or cat request of the index - ${testIndexName}`
          );
          throw e;
        }
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the indices tab
        await pageObjects.indexManagement.changeTabs('indicesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
      after(async () => {
        try {
          await es.indices.delete({
            index: testIndexName,
          });
        } catch (e) {
          log.debug(`[Setup error] Error deleting index - ${testIndexName}`);
          throw e;
        }
      });
      it('renders overview page with actual deleted document count & total size', async () => {
        await pageObjects.indexManagement.indexDetailsPage.openIndexDetailsPage(0);
        await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
        await pageObjects.indexManagement.indexDetailsPage.storageCardExist();
        await pageObjects.indexManagement.indexDetailsPage.expectTotalDatasetSizeToMatch(
          totalStorageSize
        );
        await pageObjects.indexManagement.indexDetailsPage.expectDeletedDocsToMatch(
          `${totalDocumentCount} Documents / ${deletedDocs} Deleted`
        );
      });
    });
  });
};
