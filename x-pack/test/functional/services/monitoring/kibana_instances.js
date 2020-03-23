/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringKibanaInstancesProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const SUBJ_INSTANCES_PAGE = 'kibanaInstancesPage';

  const SUBJ_TABLE_BODY = 'kibanaInstancesTableContainer';
  const SUBJ_INDEX_LINK_PREFIX = `${SUBJ_TABLE_BODY} > kibanaLink-`;

  return new (class KibanaInstances {
    async isOnInstances() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_INSTANCES_PAGE));
      return pageId !== null;
    }

    clickRowByName(instanceName) {
      return testSubjects.click(SUBJ_INDEX_LINK_PREFIX + instanceName);
    }
  })();
}
