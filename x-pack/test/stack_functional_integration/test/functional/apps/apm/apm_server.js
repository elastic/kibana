/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

describe('check apm-server', ({ getService, getPageObjects }) => {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'timePicker', 'visualize']);

  before(function() {
    log.debug('navigateToApp Visualize');
    return PageObjects.common.navigateToApp('visualize', { insertTimestamp: false });
  });

  it('Top Transactions for Time Period [APM]- should have expected test data', async function() {
    await PageObjects.visualize.openSavedVisualization('Top Transactions for Time Period [APM]');
    await PageObjects.common.sleep(1000);
    await PageObjects.common.tryForTime(40000, async () => {
      await PageObjects.timePicker.setCommonlyUsedTime('Last 2 years');
    });
    await PageObjects.common.sleep(1000);
    await PageObjects.common.tryForTime(4000, async () => {
      const dataTable = await PageObjects.visualize.getDataTableData();
      PageObjects.common.debug('Data Table = ' + dataTable.trim());
      // we loaded specific test data so we know exactly what this result should be
    });
    await PageObjects.timePicker.setCommonlyUsedTime('Today');
  });
});
