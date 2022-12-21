/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringClusterListProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['monitoring']);

  const SUBJ_TABLE_CONTAINER = 'clusterTableContainer';
  const SUBJ_TABLE_NO_DATA = `monitoringTableNoData`;
  const SUBJ_SEARCH_BAR = `${SUBJ_TABLE_CONTAINER} > monitoringTableToolBar`;

  const SUBJ_CLUSTER_ROW_PREFIX = `${SUBJ_TABLE_CONTAINER} > clusterRow_`;
  const ALERTS_MODAL_BUTTON = 'alerts-modal-remind-later-button';

  return new (class ClusterList {
    async assertDefaults() {
      await retry.try(async () => {
        if (!(await testSubjects.exists(SUBJ_TABLE_CONTAINER))) {
          throw new Error('Expected to find the cluster list');
        }
      });
    }

    assertNoData() {
      return PageObjects.monitoring.assertTableNoData(SUBJ_TABLE_NO_DATA);
    }

    getRows() {
      return PageObjects.monitoring.tableGetRowsFromContainer(SUBJ_TABLE_CONTAINER);
    }

    setFilter(text) {
      return PageObjects.monitoring.tableSetFilter(SUBJ_SEARCH_BAR, text);
    }

    clearFilter() {
      return PageObjects.monitoring.tableClearFilter(SUBJ_SEARCH_BAR);
    }

    closeAlertsModal() {
      return testSubjects.click(ALERTS_MODAL_BUTTON);
    }

    acceptAlertsModal() {
      return testSubjects.click('alerts-modal-button');
    }

    getClusterLink(clusterUuid) {
      return testSubjects.find(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > clusterLink`);
    }
    getClusterName(clusterUuid) {
      return testSubjects.getVisibleText(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > clusterLink`);
    }
    getClusterStatus(clusterUuid) {
      return testSubjects.getVisibleText(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > alertsStatus`);
    }
    getClusterNodesCount(clusterUuid) {
      return testSubjects.getVisibleText(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > nodesCount`);
    }
    getClusterIndicesCount(clusterUuid) {
      return testSubjects.getVisibleText(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > indicesCount`);
    }
    getClusterDataSize(clusterUuid) {
      return testSubjects.getVisibleText(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > dataSize`);
    }
    getClusterLogstashCount(clusterUuid) {
      return testSubjects.getVisibleText(
        `${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > logstashCount`
      );
    }
    getClusterKibanaCount(clusterUuid) {
      return testSubjects.getVisibleText(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > kibanaCount`);
    }
    getClusterLicense(clusterUuid) {
      return testSubjects.getVisibleText(
        `${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid} > clusterLicense`
      );
    }
    hasCluster(clusterUuid) {
      return testSubjects.exists(`${SUBJ_CLUSTER_ROW_PREFIX}${clusterUuid}`);
    }
  })();
}
