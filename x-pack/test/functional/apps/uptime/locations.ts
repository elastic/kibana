/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/graphql/helpers/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['uptime']);

  describe('location', () => {
    const start = new Date().toISOString();
    const end = new Date().toISOString();

    describe('when data pfewfewresent', async () => {
      const MONITOR_ID = 'location-testing-id';
      before(async () => {
        const numIps = 2;
        const checksPerMonitor = 5;
        const scheduleEvery = 10000; // fake monitor checks every 10s

        /**
         * This mogrify function will strip the documents of their location
         * data (but preserve their locaion name), which is necessary for
         * this test to work as desired.
         * @param d current document
         */
        const mogrifyNoLocation = (d: any) => {
          if (d.observer?.geo?.location) {
            d.observer.geo.location = undefined;
          }
          return d;
        };
        await makeChecksWithStatus(
          getService('legacyEs'),
          MONITOR_ID,
          checksPerMonitor,
          numIps,
          scheduleEvery,
          {
            geo: { location: 'g' },
            summary: {
              state: {
                monitor: { monitor_id: MONITOR_ID },
              },
            },
          },
          'up',
          mogrifyNoLocation
        );
      });

      it('has stuff i want it to have', async () => {
        await pageObjects.uptime.loadDataAndGoToMonitorPage(start, end, MONITOR_ID);
        await pageObjects.uptime.locationMissingIsDisplayed();
      });
    });
  });
};
