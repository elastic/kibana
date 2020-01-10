/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['header', 'common', 'settings', 'visualize']);
  const retry = getService('retry');
  const log = getService('log');

  describe('check winlogbeat', function () {

    it('winlogbeat- should have ServiceControlManager label in PieChart', async function () {
      return PageObjects.common.navigateToApp('visualize');
      //await PageObjects.visualize.filterVisByName('Sources');
      await PageObjects.visualize.openSavedVisualization('Sources');
      await PageObjects.common.sleep(1000);
      await PageObjects.header.setQuickSpan('Last 7 days');
      await PageObjects.common.sleep(1000);
      await retry.tryForTime(40000, async () => {
        const pieChart = await PageObjects.visualize.getLegendLabelsList();
        log.debug('Pie Chart labels = ' + pieChart);
        // we should always have Service Control Manager events in the windows event viewer on our test machine.
        expect(pieChart).to.contain('Service Control Manager');
      });
    });

  });
};
