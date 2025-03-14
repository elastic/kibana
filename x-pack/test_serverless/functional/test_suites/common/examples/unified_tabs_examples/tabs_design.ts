/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, getPageObjects, updateBaselines }: FtrProviderContext) => {
  const { common, header, unifiedTabs, unifiedFieldList, svlCommonPage } = getPageObjects([
    'common',
    'header',
    'unifiedTabs',
    'unifiedFieldList',
    'svlCommonPage',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const screenshot = getService('screenshots');
  const testSubjects = getService('testSubjects');

  describe('Unified Tabs Design', () => {
    before(async () => {
      await svlCommonPage.loginAsViewer();
      await browser.setWindowSize(1200, 800);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await testSubjects.click('euiCollapsibleNavButton');
      await common.navigateToApp('unifiedTabsExamples');
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({
        'theme:darkMode': false,
      });
    });

    it('should render tabs in light theme correctly', async () => {
      expect(await unifiedTabs.getNumberOfTabs()).to.be(7);

      const percentDifference = await screenshot.compareAgainstBaseline(
        'unified_tabs_project_light_theme',
        updateBaselines
      );
      expect(percentDifference).to.be.lessThan(0.0002);
    });

    it('should render tabs in dark theme correctly', async () => {
      await kibanaServer.uiSettings.update({
        'theme:darkMode': true,
      });
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      expect(await unifiedTabs.getNumberOfTabs()).to.be(7);

      const percentDifference = await screenshot.compareAgainstBaseline(
        'unified_tabs_project_dark_theme',
        updateBaselines
      );
      expect(percentDifference).to.be.lessThan(0.0002);
    });
  });
};
