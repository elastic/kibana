/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringNoDataProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return new (class NoData {
    async enableMonitoring() {
      await testSubjects.click('useInternalCollection');
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
