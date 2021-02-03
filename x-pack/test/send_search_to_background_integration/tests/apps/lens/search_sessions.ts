/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const searchSession = getService('searchSessions');
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'timePicker', 'header']);
  const listingTable = getService('listingTable');

  describe('lens search sessions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
    });
    after(async () => {
      await esArchiver.unload('lens/basic');
    });

    it("doesn't shows search sessions indicator UI", async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.isShowingNoResults()).to.be(false);

      await searchSession.missingOrFail();
    });
  });
}
