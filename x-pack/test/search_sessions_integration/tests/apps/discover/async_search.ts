/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects([
    'discover',
    'common',
    'timePicker',
    'header',
    'context',
    'searchSessionsManagement',
  ]);
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');

  describe('discover async search', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/default'
      );
      await kibanaServer.uiSettings.replace({
        'discover:enableSql': true,
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/default'
      );
    });

    it('search session id should change between searches', async () => {
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).not.to.be.empty();
      await queryBar.clickQuerySubmitButton();
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);
    });

    it('search session id should be picked up from the URL, non existing session id errors out, back button restores a session', async () => {
      let url = await browser.getCurrentUrl();
      const fakeSearchSessionId = '__test__';
      const savedSessionURL = url + `&searchSessionId=${fakeSearchSessionId}`;
      await browser.navigateTo(savedSessionURL);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      await testSubjects.existOrFail('discoverNoResultsError'); // expect error because of fake searchSessionId
      await PageObjects.common.clearAllToasts();
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).to.be(fakeSearchSessionId);
      await queryBar.clickQuerySubmitButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('completed');
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);

      // back button should restore the session:
      url = await browser.getCurrentUrl();
      expect(url).not.to.contain('searchSessionId');

      await browser.goBack();

      url = await browser.getCurrentUrl();
      expect(url).to.contain('searchSessionId');
      await PageObjects.header.waitUntilLoadingHasFinished();
      // Note this currently fails, for some reason the fakeSearchSessionId is not restored
      await searchSessions.expectState('restored');
      expect(await getSearchSessionId()).to.be(fakeSearchSessionId);
    });

    it('navigation to context cleans the session', async () => {
      await PageObjects.common.clearAllToasts();
      const table = await PageObjects.discover.getDocTable();
      const isLegacy = await PageObjects.discover.useLegacyTable();
      await table.clickRowToggle({ rowIndex: 0 });

      await retry.try(async () => {
        const rowActions = await table.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        const idxToClick = isLegacy ? 0 : 1;
        await rowActions[idxToClick].click();
      });

      await PageObjects.context.waitUntilContextLoadingHasFinished();
      await searchSessions.missingOrFail();
    });

    it('relative timerange works', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');
      const searchSessionId = await getSearchSessionId();
      expect(await PageObjects.discover.hasNoResults()).to.be(true);
      log.info('searchSessionId', searchSessionId);

      // load URL to restore a saved session
      await PageObjects.searchSessionsManagement.goTo();
      const searchSessionListBeforeRestore = await PageObjects.searchSessionsManagement.getList();
      const searchesCountBeforeRestore = searchSessionListBeforeRestore[0].searchesCount;
      // navigate to Discover
      await searchSessionListBeforeRestore[0].view();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      expect(await PageObjects.discover.hasNoResults()).to.be(true);
      expect(await toasts.getToastCount()).to.be(0); // no session restoration related warnings

      await PageObjects.searchSessionsManagement.goTo();
      const searchSessionListAfterRestore = await PageObjects.searchSessionsManagement.getList();
      const searchesCountAfterRestore = searchSessionListAfterRestore[0].searchesCount;

      expect(searchesCountBeforeRestore).to.be(searchesCountAfterRestore); // no new searches started during restore
    });

    it('should should clean the search session when navigating to SQL mode, and reinitialize when navigating back', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await searchSessions.exists()).to.be(true);
      await PageObjects.discover.selectTextBaseLang('SQL');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.missingOrFail();
      await browser.goBack();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await searchSessions.exists()).to.be(true);
    });
  });

  async function getSearchSessionId(): Promise<string> {
    await inspector.open();
    const searchSessionId = await (
      await testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await inspector.close();
    return searchSessionId;
  }
}
