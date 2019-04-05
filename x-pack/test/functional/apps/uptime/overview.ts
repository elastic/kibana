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
  describe('overview page', () => {
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(
        '2019-01-28 12:40:08.078',
        '2019-01-29 12:40:08.078',
        'monitor-page-link-auto-http-0X131221E73F825974'
      );
    });
  });
};
