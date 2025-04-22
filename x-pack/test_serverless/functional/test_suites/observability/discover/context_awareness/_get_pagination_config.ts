/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnRison from '@kbn/rison';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const dataViews = getService('dataViews');
  const dataGrid = getService('dataGrid');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const resetTimeFrame = {
    from: '2024-06-10T14:00:00.000Z',
    to: '2024-06-10T16:30:00.000Z',
  };

  const currentTimeFrame = {
    from: '2015-09-20T01:00:00.000Z',
    to: '2015-09-24T16:30:00.000Z',
  };

  describe('extension getPaginationConfig', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
      // To load more than 500 records
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${currentTimeFrame.from}", "to": "${currentTimeFrame.to}"}`,
      });
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${resetTimeFrame.from}", "to": "${resetTimeFrame.to}"}`,
      });
    });

    describe('ES|QL mode', () => {
      it('should render without pagination using a single page', async () => {
        const limit = 200;
        const state = kbnRison.encode({
          dataSource: { type: 'esql' },
          query: { esql: `from logstash* | sort @timestamp desc | limit ${limit}` },
        });
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await dataGrid.scrollTo(300);

        await PageObjects.discover.waitUntilSearchingHasFinished();
        // In ESQL Mode, pagination is disabled
        await testSubjects.missingOrFail('tablePaginationPopoverButton');
        await testSubjects.missingOrFail('pagination-button-previous');
        await testSubjects.missingOrFail('pagination-button-next');
      });
    });

    describe('data view mode', () => {
      it('should render default pagination with page numbers', async () => {
        const defaultPageLimit = 500;
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });
        await dataViews.switchTo('my-example-logs,logstash*');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await dataGrid.scrollTo(defaultPageLimit);

        await PageObjects.discover.waitUntilSearchingHasFinished();
        await testSubjects.missingOrFail('tablePaginationPopoverButton');
        await testSubjects.missingOrFail('pagination-button-previous');
        await testSubjects.missingOrFail('pagination-button-next');

        await testSubjects.existOrFail('unifiedDataTableFooter');
        await testSubjects.existOrFail('dscGridSampleSizeFetchMoreLink');

        // Clicking on Load more should fetch more data and hide the footer
        const loadMoreButton = await testSubjects.find('dscGridSampleSizeFetchMoreLink');
        await loadMoreButton.click();

        await PageObjects.discover.waitUntilSearchingHasFinished();

        // Scroll needs to be triggered to hide the footer
        await dataGrid.scrollTo(defaultPageLimit + 10);

        await testSubjects.missingOrFail('unifiedDataTableFooter');
        await testSubjects.missingOrFail('dscGridSampleSizeFetchMoreLink');
      });
    });
  });
}
