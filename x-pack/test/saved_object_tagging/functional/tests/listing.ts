/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'security', 'savedObjects', 'tagManagement']);
  const tagManagementPage = PageObjects.tagManagement;

  describe('table listing', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
      await tagManagementPage.navigateTo();
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/saved_object_tagging/common/fixtures/es_archiver/functional_base/data.json'
      );
    });

    describe('searching', () => {
      afterEach(async () => {
        await tagManagementPage.searchForTerm('');
      });

      it('allows to search by name', async () => {
        await tagManagementPage.searchForTerm('my-favorite');

        const displayedTags = await tagManagementPage.getDisplayedTagsInfo();
        expect(displayedTags.length).to.be(1);
        expect(displayedTags[0].name).to.be('my-favorite-tag');
      });

      it('allows to search by description', async () => {
        await tagManagementPage.searchForTerm('Another awesome');

        const displayedTags = await tagManagementPage.getDisplayedTagsInfo();
        expect(displayedTags.length).to.be(1);
        expect(displayedTags[0].name).to.be('tag-2');
      });
    });
  });
}
