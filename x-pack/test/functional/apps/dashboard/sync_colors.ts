/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'dashboard', 'spaceSelector', 'header', 'lens']);
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe.only('sync colors', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
    });

    after(async function () {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('lens/basic');
    });

    it('should sync colors on dashboard by default', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.clickCreateDashboardPrompt();
      await dashboardAddPanel.clickCreateNewLink();
      await dashboardAddPanel.clickVisType('lens');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await PageObjects.lens.save('vis1', true, true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.clickCreateNewLink();
      await dashboardAddPanel.clickVisType('lens');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.dest',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await PageObjects.lens.save('vis2', true, true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      console.log(await PageObjects.lens.getDashboardPanelChartDebugState(0));
      console.log(await PageObjects.lens.getDashboardPanelChartDebugState(1));
    });
  });
}
