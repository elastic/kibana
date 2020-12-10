/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'security', 'savedObjects', 'tagManagement']);
  const tagManagementPage = PageObjects.tagManagement;

  describe('table listing', () => {
    before(async () => {
      await esArchiver.load('functional_base');
      await tagManagementPage.navigateTo();
    });
    after(async () => {
      await esArchiver.unload('functional_base');
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
