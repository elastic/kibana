/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringNoDataProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);

  return new (class NoData {
    async enableMonitoring() {
      // Cloud currently does not support Metricbeat-based collection
      // so the UI does not give the user a choice between the two collection
      // methods. So if we're on cloud, do not try and switch to internal collection
      // as it's already the default
      if (!(await PageObjects.common.isCloud())) {
        await testSubjects.click('useInternalCollection');
      }
      await testSubjects.click('enableCollectionEnabled');
    }

    async isMonitoringEnabled() {
      return testSubjects.exists('monitoringCollectionEnabledMessage');
    }

    async isOnNoDataPage() {
      const pageId = await retry.try(() => testSubjects.find('noDataContainer'));
      return pageId !== null;
    }
  })();
}
