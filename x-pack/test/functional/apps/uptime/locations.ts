/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeChecksWithStatus } from '../../../api_integration/apis/uptime/rest/helper/make_checks';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const { uptime: uptimePage } = getPageObjects(['uptime']);
  const uptime = getService('uptime');
  const es = getService('es');

  const monitor = () => uptime.monitor;
  const MONITOR_ID = 'location-testing-id';

  const LessAvailMonitor = 'less-availability-monitor';

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
    await makeChecksWithStatus(es, MONITOR_ID, 5, 2, 10000, {}, 'up', mogrifyNoLocation);
  };

  const addLessAvailMonitor = async () => {
    await makeChecksWithStatus(es, LessAvailMonitor, 5, 2, 10000, {}, 'up');
    await makeChecksWithStatus(es, LessAvailMonitor, 5, 2, 10000, {}, 'down');
  };

  describe('Observer location', () => {
    const start = '~ 15 minutes ago';
    const end = 'now';

    before(async () => {
      await addMonitorWithNoLocation();
      await addLessAvailMonitor();
      await uptime.navigation.goToUptime();
      await uptimePage.goToRoot(true);
    });

    beforeEach(async () => {
      await addMonitorWithNoLocation();
      await addLessAvailMonitor();
      if (!(await uptime.navigation.isOnDetailsPage()))
        await uptimePage.loadDataAndGoToMonitorPage(start, end, MONITOR_ID);
    });

    it('displays the overall availability', async () => {
      await monitor().displayOverallAvailability('100.00 %');
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

    it('displays less monitor availability', async () => {
      await uptime.navigation.goToHomeViaBreadCrumb();
      await uptimePage.loadDataAndGoToMonitorPage(start, end, LessAvailMonitor);
      await monitor().displayOverallAvailability('50.00 %');
    });
  });
};
