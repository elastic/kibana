/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

const ML_NETWORK_SINGLE_IP_KQL =
  "/app/ml#/timeseriesexplorer?_g=(ml:(jobId:linux_anomalous_network_activity_ecs),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-08-28T11:00:00.000Z',to:'2019-08-28T13:59:59.999Z'))&_a=(mlTimeSeriesExplorer:(entities:(influencerField:'host.name',influencerValue:zeek-iowa)))&mlLocator=('ml.singleMetricViewer')&mlLocatorParams=(entities:!(('fieldName':'source.ip','fieldValue':'127.0.0.1')),jobIds:!(linux_anomalous_network_activity_ecs),query:(language:kuery,query:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)'),timeRange:(from:'2019-08-28T11:00:00.000Z',to:'2019-08-28T13:59:59.999Z'))";

const ML_NETWORK_NULL_KQL =
  "/app/ml#/timeseriesexplorer?_g=(ml:(jobId:linux_anomalous_network_activity_ecs),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-08-28T11:00:00.000Z',to:'2019-08-28T13:59:59.999Z'))&_a=(mlTimeSeriesExplorer:(entities:(influencerField:'host.name',influencerValue:zeek-iowa)))&mlLocator=('ml.singleMetricViewer')&mlLocatorParams=(entities:!(('fieldName':'source.ip','fieldValue':'$ip$')),jobIds:!(linux_anomalous_network_activity_ecs),timeRange:(from:'2019-08-28T11:00:00.000Z',to:'2019-08-28T13:59:59.999Z'))";

const ML_HOST_SINGLE_HOST_KQL =
  "/app/ml#/timeseriesexplorer?_g=(ml:(jobId:linux_anomalous_network_activity_ecs),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-06-06T06:00:00.000Z',to:'2019-06-07T05:59:59.999Z'))&_a=(mlTimeSeriesExplorer:())&mlLocator=('ml.singleMetricViewer')&mlLocatorParams=(entities:!(('fieldName':'host.name','fieldValue':'siem-windows')),jobIds:!(linux_anomalous_network_activity_ecs),query:(language:kuery,query:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)'),timeRange:(from:'2019-06-06T06:00:00.000Z',to:'2019-06-07T05:59:59.999Z'))";

const ML_HOST_MULTI_HOST_NULL_KQL =
  "/app/ml#/timeseriesexplorer?_g=(ml:(jobId:linux_anomalous_network_activity_ecs),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-06-06T06:00:00.000Z',to:'2019-06-07T05:59:59.999Z'))&_a=(mlTimeSeriesExplorer:())&mlLocator=('ml.singleMetricViewer')&mlLocatorParams=(entities:!(('fieldName':'host.name','fieldValue':'siem-windows'),('fieldName':'host.name','fieldValue':'siem-suricata')),jobIds:!(linux_anomalous_network_activity_ecs),timeRange:(from:'2019-06-06T06:00:00.000Z',to:'2019-06-07T05:59:59.999Z'))";

const ML_HOST_VARIABLE_HOST_KQL =
  "/app/ml#/timeseriesexplorer?_g=(ml:(jobId:linux_anomalous_network_activity_ecs),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-06-06T06:00:00.000Z',to:'2019-06-07T05:59:59.999Z'))&_a=(mlTimeSeriesExplorer:())&mlLocator=('ml.singleMetricViewer')&mlLocatorParams=(entities:!(('fieldName':'host.name','fieldValue':'$host.name$')),jobIds:!(linux_anomalous_network_activity_ecs),query:(language:kuery,query:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)'),timeRange:(from:'2019-06-06T06:00:00.000Z',to:'2019-06-07T05:59:59.999Z'))";

test.describe(
  'ML conditional links',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('sets KQL from a single IP with a value for the query', async ({ page }) => {
      await page.goto(ML_NETWORK_SINGLE_IP_KQL);
      await page.waitForURL(/security\/network/);

      const kqlInput = page.testSubj.locator('queryInput');
      await expect(kqlInput).toContainText(
        '(process.name: "conhost.exe" or process.name: "sc.exe")'
      );
    });

    test('redirects from a single IP with a null query to network IP page', async ({ page }) => {
      await page.goto(ML_NETWORK_NULL_KQL);
      await page.waitForURL(/security\/network/);

      await expect(page).toHaveURL(/security\/network/);
    });

    test('sets KQL from a single host name with a value for query', async ({ page }) => {
      await page.goto(ML_HOST_SINGLE_HOST_KQL);
      await page.waitForURL(/security\/hosts/);

      const kqlInput = page.testSubj.locator('queryInput');
      await expect(kqlInput).toContainText(
        '(process.name: "conhost.exe" or process.name: "sc.exe")'
      );
    });

    test('sets KQL from multiple host names with null for query', async ({ page }) => {
      await page.goto(ML_HOST_MULTI_HOST_NULL_KQL);
      await page.waitForURL(/security\/hosts/);

      const kqlInput = page.testSubj.locator('queryInput');
      await expect(kqlInput).toContainText(
        '(host.name: "siem-windows" or host.name: "siem-suricata")'
      );
    });

    test('redirects from undefined host name but with a value for query', async ({ page }) => {
      await page.goto(ML_HOST_VARIABLE_HOST_KQL);
      await page.waitForURL(/security\/hosts/);

      const kqlInput = page.testSubj.locator('queryInput');
      await expect(kqlInput).toContainText(
        '(process.name: "conhost.exe" or process.name: "sc.exe")'
      );
    });
  }
);
