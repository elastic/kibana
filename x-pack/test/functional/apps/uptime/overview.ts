/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime } = getPageObjects(['uptime']);
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');

  describe('overview page', function () {
    const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
    const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';

    before(async () => {
      await esArchiver.loadIfNeeded('uptime/full_heartbeat');
    });

    beforeEach(async () => {
      await uptime.goToRoot();
      await uptime.setDateRange(DEFAULT_DATE_START, DEFAULT_DATE_END);
      await uptime.resetFilters();
    });

    it('loads and displays uptime data based on date range', async () => {
      await uptime.goToUptimeOverviewAndLoadData(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        'monitor-page-link-0000-intermittent'
      );
    });

    it('applies filters for multiple fields', async () => {
      await uptime.selectFilterItems({
        location: ['mpls'],
        port: ['5678'],
        scheme: ['http'],
      });
      await uptime.pageHasExpectedIds([
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

    it('pagination is cleared when filter criteria changes', async () => {
      await uptime.changePage('next');
      await uptime.pageHasExpectedIds([
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
      // there should now be pagination data in the URL
      await uptime.pageUrlContains('pagination');
      await uptime.setStatusFilter('up');
      await uptime.pageHasExpectedIds([
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
      // ensure that pagination is removed from the URL
      await uptime.pageUrlContains('pagination', false);
    });

    it('clears pagination parameters when size changes', async () => {
      await uptime.changePage('next');
      await uptime.pageUrlContains('pagination');
      await uptime.setMonitorListPageSize(50);
      // the pagination parameter should be cleared after a size change
      await uptime.pageUrlContains('pagination', false);
    });

    it('pagination size updates to reflect current selection', async () => {
      await uptime.pageHasExpectedIds([
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
      await uptime.setMonitorListPageSize(50);
      await uptime.pageHasExpectedIds([
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
        '0020-down',
        '0021-up',
        '0022-up',
        '0023-up',
        '0024-up',
        '0025-up',
        '0026-up',
        '0027-up',
        '0028-up',
        '0029-up',
        '0030-intermittent',
        '0031-up',
        '0032-up',
        '0033-up',
        '0034-up',
        '0035-up',
        '0036-up',
        '0037-up',
        '0038-up',
        '0039-up',
        '0040-down',
        '0041-up',
        '0042-up',
        '0043-up',
        '0044-up',
        '0045-intermittent',
        '0046-up',
        '0047-up',
        '0048-up',
        '0049-up',
      ]);
    });

    describe('snapshot counts', () => {
      it('should not update  when status filter is set to down', async () => {
        await uptime.setStatusFilter('down');

        await retry.tryForTime(12000, async () => {
          const counts = await uptime.getSnapshotCount();
          expect(counts).to.eql({ up: '93', down: '7' });
        });
      });

      it('should not update when status filter is set to up', async () => {
        await uptime.setStatusFilter('up');
        await retry.tryForTime(12000, async () => {
          const counts = await uptime.getSnapshotCount();
          expect(counts).to.eql({ up: '93', down: '7' });
        });
      });

      it('runs filter query without issues', async () => {
        await uptime.inputFilterQuery('monitor.status:up and monitor.id:"0000-intermittent"');
        await uptime.pageHasExpectedIds(['0000-intermittent']);
        await uptime.resetFilters();
      });
    });
  });
};
