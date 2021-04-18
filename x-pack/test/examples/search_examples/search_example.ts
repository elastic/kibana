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
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  describe('Search session example', () => {
    const appId = 'searchExamples';

    before(async function () {
      await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
      await comboBox.set('indexPatternSelector', 'logstash-*');
      await comboBox.set('searchBucketField', 'geo.src');
      await comboBox.set('searchMetricField', 'memory');
      await PageObjects.timePicker.setAbsoluteRange(
        'Mar 1, 2015 @ 00:00:00.000',
        'Nov 1, 2015 @ 00:00:00.000'
      );
    });

    it('should have an other bucket', async () => {
      await testSubjects.click('searchSourceWithOther');
      await testSubjects.click('responseTab');
      const codeBlock = await testSubjects.find('responseCodeBlock');
      await retry.waitFor('get code block', async () => {
        const visibleText = await codeBlock.getVisibleText();
        const parsedResponse = JSON.parse(visibleText);
        const buckets = parsedResponse.aggregations[1].buckets;
        return (
          buckets.length === 3 && buckets[2].key === '__other__' && buckets[2].doc_count === 9039
        );
      });
    });

    it('should not have an other bucket', async () => {
      await testSubjects.click('searchSourceWithoutOther');
      await testSubjects.click('responseTab');
      const codeBlock = await testSubjects.find('responseCodeBlock');
      await retry.waitFor('get code block', async () => {
        const visibleText = await codeBlock.getVisibleText();
        const parsedResponse = JSON.parse(visibleText);
        const buckets = parsedResponse.aggregations[1].buckets;
        return buckets.length === 2;
      });
    });
  });
}
