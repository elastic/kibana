/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects }: FtrProviderContext) => {
  // TODO: add UI functional tests
  const pageObjects = getPageObjects(['uptime']);

  describe('overview page', function() {
    const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
    const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        'monitor-page-link-0000-intermittent'
      );
    });

    it('runs filter query without issues', async () => {
      await pageObjects.uptime.inputFilterQuery(
        'monitor.status:up and monitor.id:"0000-intermittent"'
      );
      await pageObjects.uptime.pageHasExpectedIds(['0000-intermittent']);
    });

    it('pagination is cleared when filter criteria changes', async () => {
      await pageObjects.uptime.goToUptimePageAndSetDateRange(DEFAULT_DATE_START, DEFAULT_DATE_END);
      await pageObjects.uptime.changePage('next');
      // there should now be pagination data in the URL
      const contains = await pageObjects.uptime.pageUrlContains('pagination');
      expect(contains).to.be(true);
      await pageObjects.uptime.pageHasExpectedIds([
        '0010-down',
        '0011-up',
        '0012-up',
        '0013-up',
        '0014-up',
        '0015-intermittent',
        '0016-up',
        '0017-up',
        '0018-up',
        '0019-up',
      ]);
      await pageObjects.uptime.setStatusFilter('up');
      // ensure that pagination is removed from the URL
      const doesNotContain = await pageObjects.uptime.pageUrlContains('pagination');
      expect(doesNotContain).to.be(false);
      await pageObjects.uptime.pageHasExpectedIds([
        '0000-intermittent',
        '0001-up',
        '0002-up',
        '0003-up',
        '0004-up',
        '0005-up',
        '0006-up',
        '0007-up',
        '0008-up',
        '0009-up',
      ]);
    });
  });
};
