/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime: uptimePage } = getPageObjects(['uptime']);
  const uptime = getService('uptime');

  const monitor = () => uptime.monitor;
  const MONITOR_ID = 'location-testing-id';

  const addMonitorWithNoLocation = async () => {
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
    await makeChecksWithStatus(
      getService('legacyEs'),
      MONITOR_ID,
      5,
      2,
      10000,
      {},
      'up',
      mogrifyNoLocation
    );
  };

  describe('Observer location', () => {
    const start = moment().subtract('15', 'm').toISOString();
    const end = moment().toISOString();

    before(async () => {
      await addMonitorWithNoLocation();
      await uptime.navigation.goToUptime();
      await uptimePage.goToRoot(true);
    });

    beforeEach(async () => {
      await addMonitorWithNoLocation();
      if (!(await uptime.navigation.isOnDetailsPage()))
        await uptimePage.loadDataAndGoToMonitorPage(start, end, MONITOR_ID);
    });

    it('displays the overall availability', async () => {
      await monitor().displayOverallAvailability();
    });

    it('can change the view to map', async () => {
      await monitor().toggleToMapView();
    });

    it('renders the location panel and canvas', async () => {
      await monitor().locationMapIsRendered();
    });

    it('renders the location missing popover when monitor has location name, but no geo data', async () => {
      await monitor().locationMissingExists();
    });
  });
};
