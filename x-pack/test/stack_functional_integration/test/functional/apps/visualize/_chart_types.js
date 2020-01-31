/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'settings', 'discover']);
  const screenshot = getService('screenshots');

  describe('visualize app', function describeIndexTests() {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToApp('visualize');
    });

    describe('chart types', function indexPatternCreation() {
      it('should show the correct chart types', function pageHeader() {
        const expectedChartTypes = [
          'Area chart',
          'Data table',
          'Line chart',
          'Markdown widget',
          'Metric',
          'Pie chart',
          'Tile map',
          'Vertical bar chart',
        ];
        // find all the chart types and make sure there all there
        return PageObjects.visualize.getChartTypes().then(function testChartTypes(chartTypes) {
          log.debug('returned chart types = ' + chartTypes);
          log.debug('expected chart types = ' + expectedChartTypes);
          return screenshot.take('Visualize-chart-types').then(() => {
            expect(chartTypes).to.eql(expectedChartTypes);
          });
        });
      });
    });
  });
}
