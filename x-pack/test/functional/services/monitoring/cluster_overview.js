/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export function MonitoringClusterOverviewProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  const SUBJ_CLUSTER_ALERTS = `clusterAlertsContainer`;
  const SUBJ_CLUSTER_NAME = `overviewTabsclusterName`;

  const SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX = `clusterItemContainer`;

  const SUBJ_ES_PANEL = `${SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX}Elasticsearch`;
  const SUBJ_ES_STATUS = `${SUBJ_ES_PANEL} > statusIcon`;
  const SUBJ_ES_VERSION = `${SUBJ_ES_PANEL} > esVersion`;
  const SUBJ_ES_UPTIME = `${SUBJ_ES_PANEL} > esUptime`;
  const SUBJ_ES_OVERVIEW = `${SUBJ_ES_PANEL} > esOverview`;
  const SUBJ_ES_NUMBER_OF_NODES = `${SUBJ_ES_PANEL} > esNumberOfNodes`;
  const SUBJ_ES_DISK_AVAILABLE = `${SUBJ_ES_PANEL} > esDiskAvailable`;
  const SUBJ_ES_JVM_HEAP = `${SUBJ_ES_PANEL} > esJvmHeap`;
  const SUBJ_ES_NUMBER_OF_INDICES = `${SUBJ_ES_PANEL} > esNumberOfIndices`;
  const SUBJ_ES_DOCUMENTS_COUNT = `${SUBJ_ES_PANEL} > esDocumentsCount`;
  const SUBJ_ES_DISK_USAGE = `${SUBJ_ES_PANEL} > esDiskUsage`;
  const SUBJ_ES_PRIMARY_SHARDS = `${SUBJ_ES_PANEL} > esPrimaryShards`;
  const SUBJ_ES_REPLICA_SHARDS = `${SUBJ_ES_PANEL} > esReplicaShards`;
  const SUBJ_ES_ML_JOBS = `${SUBJ_ES_PANEL} > esMlJobs`;

  const SUBJ_KBN_PANEL = `${SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX}Kibana`;
  const SUBJ_KBN_STATUS = `${SUBJ_KBN_PANEL} > statusIcon`;
  const SUBJ_KBN_REQUESTS = `${SUBJ_KBN_PANEL} > kbnRequests`;
  const SUBJ_KBN_MAX_RESPONSE_TIME = `${SUBJ_KBN_PANEL} > kbnMaxResponseTime`;
  const SUBJ_KBN_CONNECTIONS = `${SUBJ_KBN_PANEL} > kbnConnections`;
  const SUBJ_KBN_MEMORY_USAGE = `${SUBJ_KBN_PANEL} > kbnMemoryUsage`;
  const SUBJ_KBN_OVERVIEW = `${SUBJ_KBN_PANEL} > kbnOverview`;
  const SUBJ_KBN_INSTANCES = `${SUBJ_KBN_PANEL} > kbnInstances`;

  const SUBJ_LS_PANEL = `${SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX}Logstash`;
  const SUBJ_LS_EVENTS_RECEIVED = `${SUBJ_LS_PANEL} > lsEventsReceived`;
  const SUBJ_LS_EVENTS_EMITTED = `${SUBJ_LS_PANEL} > lsEventsEmitted`;
  const SUBJ_LS_NODES = `${SUBJ_LS_PANEL} > lsNodes`;
  const SUBJ_LS_UPTIME = `${SUBJ_LS_PANEL} > lsUptime`;
  const SUBJ_LS_JVM_HEAP = `${SUBJ_LS_PANEL} > lsJvmHeap`;
  const SUBJ_LS_PIPELINES = `${SUBJ_LS_PANEL} > lsPipelines`;
  const SUBJ_LS_OVERVIEW = `${SUBJ_LS_PANEL} > lsOverview`;

  const SUBJ_BEATS_PANEL = `${SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX}Beats`;
  const SUBJ_BEATS_OVERVIEW = `${SUBJ_BEATS_PANEL} > beatsOverview`;
  const SUBJ_BEATS_TOTAL_EVENTS = `${SUBJ_BEATS_PANEL} > beatsTotalEvents`;
  const SUBJ_BEATS_BYTES_SENT = `${SUBJ_BEATS_PANEL} > beatsBytesSent`;
  const SUBJ_BEATS_LISTING = `${SUBJ_BEATS_PANEL} > beatsListing`;
  const SUBJ_BEATS_TYPES_COUNTS = `${SUBJ_BEATS_PANEL} > beatTypeCount`;

  const SUBJ_ENT_SEARCH_PANEL = `${SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX}Enterprise Search`;
  const SUBJ_ENT_SEARCH_TOTAL_NODES = `${SUBJ_ENT_SEARCH_PANEL} > entSearchTotalNodes`;
  const SUBJ_ENT_SEARCH_OVERVIEW = `${SUBJ_ENT_SEARCH_PANEL} > entSearchOverview`;
  const SUBJ_ENT_SEARCH_ENGINES = `${SUBJ_ENT_SEARCH_PANEL} > appSearchEngines`;
  const SUBJ_ENT_SEARCH_ORG_SOURCES = `${SUBJ_ENT_SEARCH_PANEL} > workplaceSearchOrgSources`;

  return new (class ClusterOverview {
    async isOnClusterOverview() {
      await retry.try(async () => {
        const clusterHeadingElement = await testSubjects.find(SUBJ_CLUSTER_NAME);
        expect(await clusterHeadingElement.isDisplayed()).to.be(true);
      });
      await retry.try(async () => {
        const clusterHeading = await testSubjects.find(SUBJ_CLUSTER_NAME);
        expect(await clusterHeading.getVisibleText()).not.to.be.empty();
      });
      return true;
    }

    async getClusterName() {
      return testSubjects.getVisibleText(SUBJ_CLUSTER_NAME);
    }

    doesClusterAlertsExist() {
      return testSubjects.exists(SUBJ_CLUSTER_ALERTS);
    }

    closeAlertsModal() {
      return testSubjects.click('alerts-modal-remind-later-button');
    }

    acceptAlertsModal() {
      return testSubjects.click('alerts-modal-button');
    }

    async getPresentPanels() {
      const panelElements = await find.allByCssSelector(
        `[data-test-subj^="${SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX}"]`
      );
      const panelTestSubjects = await Promise.all(
        panelElements.map((e) => e.getAttribute('data-test-subj'))
      );
      return panelTestSubjects.map((e) => e.replace(SUBJ_CLUSTER_ITEM_CONTAINER_PREFIX, ''));
    }

    getEsStatus() {
      return testSubjects.getVisibleText(SUBJ_ES_STATUS);
    }
    getEsVersion() {
      return testSubjects.getVisibleText(SUBJ_ES_VERSION);
    }
    getEsUptime() {
      return testSubjects.getVisibleText(SUBJ_ES_UPTIME);
    }
    getEsNumberOfNodes() {
      return testSubjects.getVisibleText(SUBJ_ES_NUMBER_OF_NODES);
    }
    getEsDiskAvailable() {
      return testSubjects.getVisibleText(SUBJ_ES_DISK_AVAILABLE);
    }
    getEsJvmHeap() {
      return testSubjects.getVisibleText(SUBJ_ES_JVM_HEAP);
    }
    getEsNumberOfIndices() {
      return testSubjects.getVisibleText(SUBJ_ES_NUMBER_OF_INDICES);
    }
    getEsDocumentsCount() {
      return testSubjects.getVisibleText(SUBJ_ES_DOCUMENTS_COUNT);
    }
    getEsDiskUsage() {
      return testSubjects.getVisibleText(SUBJ_ES_DISK_USAGE);
    }
    getEsPrimaryShards() {
      return testSubjects.getVisibleText(SUBJ_ES_PRIMARY_SHARDS);
    }
    getEsReplicaShards() {
      return testSubjects.getVisibleText(SUBJ_ES_REPLICA_SHARDS);
    }

    clickEsOverview() {
      return testSubjects.click(SUBJ_ES_OVERVIEW);
    }
    clickEsNodes() {
      return testSubjects.click(SUBJ_ES_NUMBER_OF_NODES);
    }
    clickEsIndices() {
      return testSubjects.click(SUBJ_ES_NUMBER_OF_INDICES);
    }

    doesEsMlJobsExist() {
      return testSubjects.exists(SUBJ_ES_ML_JOBS);
    }
    getEsMlJobs() {
      return testSubjects.getVisibleText(SUBJ_ES_ML_JOBS);
    }

    getKbnStatus() {
      return testSubjects.getVisibleText(SUBJ_KBN_STATUS);
    }
    getKbnRequests() {
      return testSubjects.getVisibleText(SUBJ_KBN_REQUESTS);
    }
    getKbnMaxResponseTime() {
      return testSubjects.getVisibleText(SUBJ_KBN_MAX_RESPONSE_TIME);
    }
    getKbnInstances() {
      return testSubjects.getVisibleText(SUBJ_KBN_INSTANCES);
    }
    getKbnConnections() {
      return testSubjects.getVisibleText(SUBJ_KBN_CONNECTIONS);
    }
    getKbnMemoryUsage() {
      return testSubjects.getVisibleText(SUBJ_KBN_MEMORY_USAGE);
    }
    clickKibanaOverview() {
      return testSubjects.click(SUBJ_KBN_OVERVIEW);
    }
    clickKibanaInstances() {
      return testSubjects.click(SUBJ_KBN_INSTANCES);
    }

    getLsEventsReceived() {
      return testSubjects.getVisibleText(SUBJ_LS_EVENTS_RECEIVED);
    }
    getLsEventsEmitted() {
      return testSubjects.getVisibleText(SUBJ_LS_EVENTS_EMITTED);
    }
    getLsNodes() {
      return testSubjects.getVisibleText(SUBJ_LS_NODES);
    }
    getLsUptime() {
      return testSubjects.getVisibleText(SUBJ_LS_UPTIME);
    }
    getLsJvmHeap() {
      return testSubjects.getVisibleText(SUBJ_LS_JVM_HEAP);
    }
    clickLsOverview() {
      return testSubjects.click(SUBJ_LS_OVERVIEW);
    }
    clickLsNodes() {
      return testSubjects.click(SUBJ_LS_NODES);
    }
    getLsPipelines() {
      return testSubjects.getVisibleText(SUBJ_LS_PIPELINES);
    }
    clickLsPipelines() {
      return testSubjects.click(SUBJ_LS_PIPELINES);
    }

    getBeatsTotalEventsRate() {
      return testSubjects.getVisibleText(SUBJ_BEATS_TOTAL_EVENTS);
    }
    getBeatsTotalBytesSentRate() {
      return testSubjects.getVisibleText(SUBJ_BEATS_BYTES_SENT);
    }
    async getBeatsListingDetail() {
      const total = await testSubjects.getVisibleText(SUBJ_BEATS_LISTING + '> beatsTotal');
      const counts = await testSubjects.getAttributeAll(
        SUBJ_BEATS_TYPES_COUNTS,
        'data-test-beat-type-count'
      );

      const countsByType = counts.reduce((accum, text) => {
        const [type, count] = text.split(':');
        return {
          ...accum,
          [type.toLowerCase()]: count,
        };
      }, {});

      return {
        total,
        types: countsByType,
      };
    }
    clickBeatsOverview() {
      return testSubjects.click(SUBJ_BEATS_OVERVIEW);
    }
    clickBeatsListing() {
      return testSubjects.click(SUBJ_BEATS_LISTING);
    }

    getEntSearchTotalNodes() {
      return testSubjects.getVisibleText(SUBJ_ENT_SEARCH_TOTAL_NODES);
    }
    getEntSearchTotalEngines() {
      return testSubjects.getVisibleText(SUBJ_ENT_SEARCH_ENGINES);
    }
    getEntSearchTotalOrgSources() {
      return testSubjects.getVisibleText(SUBJ_ENT_SEARCH_ORG_SOURCES);
    }
    clickEntSearchOverview() {
      return testSubjects.click(SUBJ_ENT_SEARCH_OVERVIEW);
    }
  })();
}
