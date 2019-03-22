/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// tslint:disable-next-line:no-default-export
export default ({ getPageObjects }: KibanaFunctionalTestDefaultProviders) => {
  // TODO: add UI functional tests
  const pageObjects = getPageObjects(['uptime']);
  const DATE_RANGE_START = '2019-01-28 12:40:08.078';
  describe('overview page', () => {
    it('loads and displays uptime data based on date range', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(
        DATE_RANGE_START,
        'monitor-page-link-auto-http-0X131221E73F825974'
      );
    });

    it('handles simple_query_string and must_not ES queries', async () => {
      await pageObjects.uptime.applyCustomFilterQuery(
        DATE_RANGE_START,
        '-auto-http-0X131221E73F825974 http monitor.status:up monitor.duration.us<300000',
        [
          'monitor-page-link-auto-http-0X970CBD2F2102BFA8',
          'monitor-page-link-auto-http-0X9CB71300ABD5A2A8',
          'monitor-page-link-auto-http-0XC9CDA429418EDC2B',
          'monitor-page-link-auto-http-0XD9AE729FC1C1E04A',
          'monitor-page-link-auto-http-0XDD2D4E60FD4A61C3',
        ]
      );
    });
  });
};
