/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['monitoring', 'common', 'header']);
  const esSupertest = getService('esSupertest');
  const noData = getService('monitoringNoData');
  const clusterOverview = getService('monitoringClusterOverview');
  const retry = getService('retry');

  describe('Monitoring is turned off', () => {
    before(async () => {
      const remote = getService('remote');
      await remote.setWindowSize(1600, 1000);
      await PageObjects.monitoring.navigateTo();
      await noData.isOnNoDataPage();
      await PageObjects.header.resumeAutoRefresh();
    });

    after(async () => {
      // turn off collection
      const disableCollection = {
        "persistent":
        {
          xpack: {
            monitoring: {
              collection: {
                enabled: false
              }
            }
          }
        }
      };

      await esSupertest.put('/_cluster/settings').send(disableCollection).expect(200);
      await esSupertest.delete('/.monitoring-*').expect(200);
    });

    it('Monitoring enabled', async function ()  {
      await noData.enableMonitoring();
      await retry.try(async () => {
        expect(await noData.isMonitoringEnabled()).to.be(true);
      });

      // Here we are checking that once Monitoring is enabled,
      //it moves on to the cluster overview page.
      await retry.try(async () => {
        expect(await clusterOverview.isOnClusterOverview()).to.be(true);
      });
    });
  });
}
