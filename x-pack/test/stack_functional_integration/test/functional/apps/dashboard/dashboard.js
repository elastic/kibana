/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'settings', 'dashboard']);
  const retry = getService('retry');
  const log = getService('log');
  const screenshot = getService('screenshots');

  describe('dashboard tab', function describeIndexTests() {
    before(async () => {
      log.debug('navigateToApp dashboard');
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.common.sleep(4000);
      // wait for the logstash data load to finish if it hasn't already
    });

    describe('add visualizations to dashboard', () => {
      const visualizations = [
        'Visualization漢字 AreaChart',
        'Visualization☺漢字 DataTable',
        'Visualization漢字 LineChart',
        'Visualization PieChart',
        'Visualization TileMap',
        'Visualization☺ VerticalBarChart',
        'Visualization MetricChart',
      ];

      it('should be able to add visualizations to dashboard', async () => {
        await screenshot.take('Dashboard-no-visualizations');

        const addVisualizations = xs => {
          return xs.reduce(async (promise, vizName) => {
            await promise;
            await PageObjects.dashboard.addVisualizations(vizName);
          }, Promise.resolve());
        };

        await addVisualizations(visualizations);
        log.debug('done adding visualizations');
        screenshot.take('Dashboard-add-visualizations');
      });

      it('set the timepicker time to that which contains our test data', async () => {
        const fromTime = '2015-09-19 06:31:44.000';
        const toTime = '2015-09-23 18:31:44.000';

        log.debug('Set absolute time range from "' + fromTime + '" to "' + toTime + '"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.getSpinnerDone();
        await screenshot.take('Dashboard-set-timepicker');
      });

      it('should save and load dashboard', async () => {
        const dashboardName = 'Dashboard Test 1';
        // TODO: save time on the dashboard and test it
        await PageObjects.dashboard.saveDashboard(dashboardName);
        // click New Dashboard just to clear the one we just created
        await retry.try(async () => {
          log.debug('### saved Dashboard, now click New Dashboard');
          await PageObjects.dashboard.clickNewDashboard();
        });
        await retry.try(function() {
          log.debug('### now re-load previously saved dashboard');
          return PageObjects.dashboard.loadSavedDashboard(dashboardName);
        });
        screenshot.take('Dashboard-load-saved');
      });

      it('should have all the expected visualizations', async () => {
        await retry.tryForTime(10000, async () => {
          const panelTitles = await PageObjects.dashboard.getPanelTitles();
          log.debug('### visualization titles = ' + panelTitles);
          expect(panelTitles).to.eql(visualizations);
        });
        screenshot.take('Dashboard-has-visualizations');
      });

      it('should have all the expected initial sizes', async () => {
        const visObjects = [
          {
            dataCol: '1',
            dataRow: '1',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization漢字 AreaChart',
          },
          {
            dataCol: '4',
            dataRow: '1',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization☺漢字 DataTable',
          },
          {
            dataCol: '7',
            dataRow: '1',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization漢字 LineChart',
          },
          {
            dataCol: '10',
            dataRow: '1',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization PieChart',
          },
          {
            dataCol: '1',
            dataRow: '3',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization TileMap',
          },
          {
            dataCol: '4',
            dataRow: '3',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization☺ VerticalBarChart',
          },
          {
            dataCol: '7',
            dataRow: '3',
            dataSizeX: '3',
            dataSizeY: '2',
            title: 'Visualization MetricChart',
          },
        ];
        await retry.tryForTime(10000, async () => {
          await PageObjects.dashboard.getPanelData().then(function(panelTitles) {
            PageObjects.common.log('visualization titles = ' + panelTitles);
            PageObjects.common.saveScreenshot('Dashboard-visualization-sizes');
            expect(panelTitles).to.eql(visObjects);
          });
        });
      });
    });
  });
}
