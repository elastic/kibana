/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'error',
    'discover',
    'timePicker',
    'security',
    'spaceSelector',
    'header',
  ]);

  async function setDiscoverTimeRange() {
    await PageObjects.timePicker.setDefaultAbsoluteRange();
  }

  describe('discover field visualize button', () => {
    beforeEach(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
      await PageObjects.common.navigateToApp('discover');
      await setDiscoverTimeRange();
    });

    after(async () => {
      await esArchiver.unload('lens/basic');
    });

    it('shows "visualize" field button', async () => {
      await PageObjects.discover.clickFieldListItem('bytes');
      await PageObjects.discover.expectFieldListItemVisualize('bytes');
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      await PageObjects.discover.findFieldByName('bytes');
      await PageObjects.discover.clickFieldListItemVisualize('bytes');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[1].getVisibleText()).to.be('Average of bytes');
      });
    });

    it('should preserve app filters in lens', async () => {
      await filterBar.addFilter('bytes', 'is between', '3500', '4000');
      await PageObjects.discover.findFieldByName('geo.src');
      await PageObjects.discover.clickFieldListItemVisualize('geo.src');
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.hasFilter('bytes', '3,500 to 4,000')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await PageObjects.discover.findFieldByName('geo.dest');
      await PageObjects.discover.clickFieldListItemVisualize('geo.dest');
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });
  });
}
