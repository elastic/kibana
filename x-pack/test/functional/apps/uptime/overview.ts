/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects }: FtrProviderContext) => {
  // TODO: add UI functional tests
  const pageObjects = getPageObjects(['uptime']);

  describe('overview page', function() {
    const DEFAULT_DATE_START = '2019-09-10 12:40:08.078';
    const DEFAULT_DATE_END = '2019-09-11 19:40:08.078';
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        'monitor-page-link-0000-intermittent'
      );
    });

    it('runs filter query without issues', async () => {
      await pageObjects.uptime.inputFilterQuery(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        'monitor.status:up and monitor.id:"0000-intermittent"',
        'monitor-page-link-0000-intermittent'
      );
    });
  });
};
