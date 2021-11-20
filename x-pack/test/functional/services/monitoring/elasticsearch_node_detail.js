/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringElasticsearchNodeDetailProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SUMMARY = 'elasticsearchNodeDetailStatus';
  const SUBJ_SUMMARY_TRANSPORT_ADDRESS = `${SUBJ_SUMMARY} > transportAddress`;
  const SUBJ_SUMMARY_JVM_HEAP = `${SUBJ_SUMMARY} > jvmHeap`;
  const SUBJ_SUMMARY_FREE_DISK_SPACE = `${SUBJ_SUMMARY} > freeDiskSpace`;
  const SUBJ_SUMMARY_DOCUMENT_COUNT = `${SUBJ_SUMMARY} > documentCount`;
  const SUBJ_SUMMARY_DATA_SIZE = `${SUBJ_SUMMARY} > dataSize`;
  const SUBJ_SUMMARY_INDICES_COUNT = `${SUBJ_SUMMARY} > indicesCount`;
  const SUBJ_SUMMARY_SHARDS_COUNT = `${SUBJ_SUMMARY} > shardsCount`;
  const SUBJ_SUMMARY_NODE_TYPE = `${SUBJ_SUMMARY} > nodeType`;
  const SUBJ_SUMMARY_STATUS = `${SUBJ_SUMMARY} > statusIcon`;

  return new (class ElasticsearchNodeDetail {
    async clickAdvanced() {
      return testSubjects.click('esItemDetailAdvancedLink');
    }

    async getSummary() {
      return {
        transportAddress: await testSubjects.getVisibleText(SUBJ_SUMMARY_TRANSPORT_ADDRESS),
        jvmHeap: await testSubjects.getVisibleText(SUBJ_SUMMARY_JVM_HEAP),
        freeDiskSpace: await testSubjects.getVisibleText(SUBJ_SUMMARY_FREE_DISK_SPACE),
        documentCount: await testSubjects.getVisibleText(SUBJ_SUMMARY_DOCUMENT_COUNT),
        dataSize: await testSubjects.getVisibleText(SUBJ_SUMMARY_DATA_SIZE),
        indicesCount: await testSubjects.getVisibleText(SUBJ_SUMMARY_INDICES_COUNT),
        shardsCount: await testSubjects.getVisibleText(SUBJ_SUMMARY_SHARDS_COUNT),
        nodeType: await testSubjects.getVisibleText(SUBJ_SUMMARY_NODE_TYPE),
        status: await testSubjects.getAttribute(SUBJ_SUMMARY_STATUS, 'alt'),
      };
    }
  })();
}
