/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/graphql/helpers/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['uptime']);
  const retry = getService('retry');

  describe('location', () => {
    const start = new Date().toISOString();
    const end = new Date().toISOString();

    const MONITOR_ID = 'location-testing-id';
    const CUSTOM_GEO_NAME = 'filter-test';
    before(async () => {
      /**
       * This mogrify function will strip the documents of their location
       * data (but preserve their location name), which is necessary for
       * this test to work as desired.
       * @param d current document
       */
      const mogrifyNoLocation = (d: any) => {
        if (d.observer?.geo?.location) {
          d.observer.geo.location = undefined;
        }
        return d;
      };
      const esService = getService('legacyEs');
      await makeChecksWithStatus(esService, MONITOR_ID, 5, 2, 10000, {}, 'up', mogrifyNoLocation);
      await makeChecksWithStatus(esService, 'filter-testing', 50, 1, 10000, {}, 'up', (d: any) => {
        d.observer.geo.name = CUSTOM_GEO_NAME;
        return d;
      });
    });

    it('renders the location missing popover when monitor has location name, but no geo data', async () => {
      await pageObjects.uptime.loadDataAndGoToMonitorPage(start, end, MONITOR_ID);
      await pageObjects.uptime.locationMissingIsDisplayed();
    });

    it('adds a second location filter option and filters the overview', async () => {
      await pageObjects.uptime.goToUptimePageAndSetDateRange(start, end);
      await pageObjects.uptime.selectFilterItems({ location: [CUSTOM_GEO_NAME] });
      await retry.tryForTime(12000, async () => {
        const ariaLabel = await pageObjects.uptime.getAriaLabelForKey(
          'xpack.uptime.charts.pingHistogram'
        );
        expect(ariaLabel).to.contain('Bar Chart showing uptime status over time');
        expect(ariaLabel).to.contain('The maximum value is 2 pings, with 2 up and 0 down');
        expect(ariaLabel).to.contain('The most recent count is 2, with 2 up and 0 down');
        const snapshotCount = await pageObjects.uptime.getSnapshotCount();
        expect(snapshotCount).to.eql({ up: '1', down: '0' });
      });
    });
  });
};
