/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects }: KibanaFunctionalTestDefaultProviders) => {
  // TODO: add UI functional tests
  const pageObjects = getPageObjects(['uptime']);

  // FLAKY: https://github.com/elastic/kibana/issues/35773
  describe.skip('overview page', function() {
    this.tags(['skipFirefox']);
    const DEFAULT_DATE_START = '2019-01-28 12:40:08.078';
    const DEFAULT_DATE_END = '2019-01-29 12:40:08.078';
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        'monitor-page-link-auto-http-0X131221E73F825974'
      );
    });

    it('runs filter query without issues', async () => {
      await pageObjects.uptime.inputFilterQuery(
        DEFAULT_DATE_START,
        DEFAULT_DATE_END,
        'monitor.status:up monitor.id:auto-http-0X131221E73F825974'
      );
    });
  });
};
