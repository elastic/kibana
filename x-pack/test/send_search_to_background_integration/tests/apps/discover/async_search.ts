/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['discover', 'common', 'timePicker', 'header']);

  describe('discover async search', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('discover/default');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('search session id should change between searches', async () => {
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).not.to.be.empty();
      await queryBar.clickQuerySubmitButton();
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);
    });

    it('search session id should be picked up from the URL, non existing session id errors out', async () => {
      const url = await browser.getCurrentUrl();
      const fakeSearchSessionId = '__test__';
      const savedSessionURL = url + `&searchSessionId=${fakeSearchSessionId}`;
      await browser.navigateTo(savedSessionURL);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverNoResultsError'); // expect error because of fake searchSessionId
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).to.be(fakeSearchSessionId);
      await queryBar.clickQuerySubmitButton();
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);
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
