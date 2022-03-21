/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'security']);
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const a11y = getService('a11y');
  const flyout = getService('flyout');
  const esArchiver = getService('esArchiver');

  describe('Accessibility Search Profiler Editor', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await PageObjects.common.navigateToApp('searchProfiler');
      await a11y.testAppSnapshot();
      expect(await testSubjects.exists('searchProfilerEditor')).to.be(true);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await flyout.ensureAllClosed();
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

    it('close the flyout', async () => {
      await testSubjects.click('euiFlyoutCloseButton');
      await a11y.testAppSnapshot();
    });

    it('click on the open-close shard details link', async () => {
      const openShardDetailslink = await testSubjects.findAll('openCloseShardDetails');
      await openShardDetailslink[0].click();
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
  });
}
