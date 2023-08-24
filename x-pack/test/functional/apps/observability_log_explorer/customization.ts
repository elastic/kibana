/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'navigationalSearch']);
  const testSubjects = getService('testSubjects');

  describe('Customizations', () => {
    before('initialize tests', async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('when Discover is loaded with the log-explorer profile', () => {
      it('DatasetSelector should replace the DataViewPicker', async () => {
        // Assert does not render on discover app
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.missingOrFail('datasetSelectorPopover');

        // Assert it renders on log-explorer profile
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        await testSubjects.existOrFail('datasetSelectorPopover');
      });

      it('the TopNav bar should hide then New, Open and Save options', async () => {
        // Assert does not render on discover app
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverNewButton');
        await testSubjects.existOrFail('discoverOpenButton');
        await testSubjects.existOrFail('shareTopNavButton');
        await testSubjects.existOrFail('discoverAlertsButton');
        await testSubjects.existOrFail('openInspectorButton');
        await testSubjects.existOrFail('discoverSaveButton');

        // Assert it renders on log-explorer profile
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        await testSubjects.missingOrFail('discoverNewButton');
        await testSubjects.missingOrFail('discoverOpenButton');
        await testSubjects.existOrFail('shareTopNavButton');
        await testSubjects.existOrFail('discoverAlertsButton');
        await testSubjects.existOrFail('openInspectorButton');
        await testSubjects.missingOrFail('discoverSaveButton');
      });

      it('should add a searchable deep link to the profile page', async () => {
        await PageObjects.common.navigateToApp('home');
        await PageObjects.navigationalSearch.searchFor('discover log explorer');

        const results = await PageObjects.navigationalSearch.getDisplayedResults();
        expect(results[0].label).to.eql('Discover / Logs Explorer');
      });

      it('should render a filter controls section as part of the unified search bar', async () => {
        // Assert does not render on discover app
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.missingOrFail('datasetFiltersCustomization');

        // Assert it renders on log-explorer profile
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        await testSubjects.existOrFail('datasetFiltersCustomization', { allowHidden: true });
      });
    });
  });
}
