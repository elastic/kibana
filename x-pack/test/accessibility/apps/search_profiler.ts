/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'security']);
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const a11y = getService('a11y');
  const flyout = getService('flyout');

  describe('Accessibility Search Profiler Editor', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('searchProfiler');
      await a11y.testAppSnapshot();
      expect(await testSubjects.exists('searchProfilerEditor')).to.be(true);
    });

    it('input the JSON in the aceeditor', async () => {
      const input = {
        query: {
          bool: {
            should: [
              {
                match: {
                  name: 'fred',
                },
              },
              {
                terms: {
                  name: ['sue', 'sally'],
                },
              },
            ],
          },
        },
        aggs: {
          stats: {
            stats: {
              field: 'price',
            },
          },
        },
      };

      await aceEditor.setValue('searchProfilerEditor', JSON.stringify(input));
      await a11y.testAppSnapshot();
    });

    it('click on the profile button', async () => {
      await testSubjects.click('profileButton');
      await a11y.testAppSnapshot();
    });

    it('click on the dropdown link', async () => {
      const viewShardDetailslink = await testSubjects.findAll('viewShardDetails');
      await viewShardDetailslink[0].click();
      await a11y.testAppSnapshot();
    });

    it('click on the open-close shard details link', async () => {
      const openShardDetailslink = await testSubjects.findAll('openCloseShardDetails');
      await openShardDetailslink[0].click();
      await a11y.testAppSnapshot();
    });

    it('close the fly out', async () => {
      await flyout.ensureAllClosed();
      await a11y.testAppSnapshot();
    });

    it('click on the Aggregation Profile link', async () => {
      await testSubjects.click('aggregationProfileTab');
      await a11y.testAppSnapshot();
    });

    it('click on the view details link', async () => {
      const viewShardDetailslink = await testSubjects.findAll('viewShardDetails');
      await viewShardDetailslink[0].click();
      await a11y.testAppSnapshot();
    });

    it('close the fly out', async () => {
      await flyout.ensureAllClosed();
      await a11y.testAppSnapshot();
    });
  });
}
