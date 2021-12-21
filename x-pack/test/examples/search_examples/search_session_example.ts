/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const log = getService('log');
  const es = getService('es');
  const searchSessions = getService('searchSessions');
  const comboBox = getService('comboBox');

  describe('Search session example', () => {
    const appId = 'searchExamples';

    before(async function () {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
        return;
      }

      await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
      await testSubjects.click('/search-sessions');
    });

    after(async () => {
      await searchSessions.deleteAllSearchSessions();
    });

    it('should start search, save session, restore session using "restore" button', async () => {
      await comboBox.setCustom('dataViewSelector', 'logstash-*');
      await comboBox.setCustom('searchMetricField', 'bytes');
      await testSubjects.clickWhenNotDisabled('startSearch');
      await testSubjects.find('searchResults-1');
      await searchSessions.expectState('completed');
      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');
      await testSubjects.click('restoreSearch');
      await testSubjects.find('searchResults-2');
    });
  });
}
