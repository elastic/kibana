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
  const { discover, common, timePicker, header, context, searchSessionsManagement } =
    getPageObjects([
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

  // FLAKY: https://github.com/elastic/kibana/issues/195955
  describe.skip('discover async search', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/discover/default'
      );
      await kibanaServer.uiSettings.replace({
        enableESQL: true,
      });
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
      await header.waitUntilLoadingHasFinished();
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
      await header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      await testSubjects.existOrFail('discoverErrorCalloutTitle'); // expect error because of fake searchSessionId
      await toasts.dismissAll();
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).to.be(fakeSearchSessionId);
      await queryBar.clickQuerySubmitButton();
      await header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('completed');
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);

      // back button should restore the session:
      url = await browser.getCurrentUrl();
      expect(url).not.to.contain('searchSessionId');

      await browser.goBack();

      url = await browser.getCurrentUrl();
      expect(url).to.contain('searchSessionId');
      await header.waitUntilLoadingHasFinished();
      // Note this currently fails, for some reason the fakeSearchSessionId is not restored
      await searchSessions.expectState('restored');
      expect(await getSearchSessionId()).to.be(fakeSearchSessionId);

      // back navigation takes discover to fakeSearchSessionId which is in error state
      // clean up page to get out of error state before proceeding to next test
      await toasts.dismissAll();
      await queryBar.clickQuerySubmitButton();
      await header.waitUntilLoadingHasFinished();
    });

    it('navigation to context cleans the session', async () => {
      const table = await discover.getDocTable();
      const isLegacy = await discover.useLegacyTable();
      await table.clickRowToggle({ rowIndex: 0 });

      await retry.try(async () => {
        const rowActions = await table.getRowActions({ rowIndex: 0 });
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        const idxToClick = isLegacy ? 0 : 1;
        await rowActions[idxToClick].click();
      });

      await context.waitUntilContextLoadingHasFinished();
      await searchSessions.missingOrFail();
    });

    it('relative timerange works', async () => {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      const url = await browser.getCurrentUrl();

      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');
      const searchSessionId = await getSearchSessionId();
      expect(await discover.hasNoResults()).to.be(true);
      log.info('searchSessionId', searchSessionId);

      // load URL to restore a saved session
      await searchSessionsManagement.goTo();
      const searchSessionListBeforeRestore = await searchSessionsManagement.getList();
      const searchesCountBeforeRestore = searchSessionListBeforeRestore[0].searchesCount;

      // navigate to Discover
      // Instead of clicking the link to navigate to Discover, we load Discover from scratch (just like we did when we
      // ran the search session before saving). This ensures that the same number of requests are made.
      // await searchSessionListBeforeRestore[0].view();
      const restoreUrl = new URL(searchSessionListBeforeRestore[0].mainUrl, url).href;
      await browser.navigateTo(restoreUrl);

      await header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      expect(await discover.hasNoResults()).to.be(true);
      expect(await toasts.getCount()).to.be(0); // no session restoration related warnings

      await searchSessionsManagement.goTo();
      const searchSessionListAfterRestore = await searchSessionsManagement.getList();
      const searchesCountAfterRestore = searchSessionListAfterRestore[0].searchesCount;

      expect(searchesCountBeforeRestore).to.be(searchesCountAfterRestore); // no new searches started during restore
    });

    it('should should clean the search session when navigating to ESQL mode, and reinitialize when navigating back', async () => {
      await common.navigateToApp('discover');
      await timePicker.setDefaultAbsoluteRange();
      await header.waitUntilLoadingHasFinished();
      expect(await searchSessions.exists()).to.be(true);
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await searchSessions.missingOrFail();
      await browser.goBack();
      await header.waitUntilLoadingHasFinished();
      expect(await searchSessions.exists()).to.be(true);
    });
  });

  async function getSearchSessionId(): Promise<string> {
    await inspector.open();
    const searchSessionId = await (
      await testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await inspector.close();
    return searchSessionId ?? '';
  }
}
