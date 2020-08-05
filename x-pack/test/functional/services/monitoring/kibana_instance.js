/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringKibanaInstanceProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const SUBJ_INSTANCE_PAGE = 'kibanaInstancePage';

  const SUBJ_SUMMARY = 'kibanaDetailStatus';
  const SUBJ_SUMMARY_TRANSPORT_ADDRESS = `${SUBJ_SUMMARY} > transportAddress`;
  const SUBJ_SUMMARY_OS_FREE_MEMORY = `${SUBJ_SUMMARY} > osFreeMemory`;
  const SUBJ_SUMMARY_VERSION = `${SUBJ_SUMMARY} > version`;
  const SUBJ_SUMMARY_UPTIME = `${SUBJ_SUMMARY} > uptime`;
  const SUBJ_SUMMARY_HEALTH = `${SUBJ_SUMMARY} > statusIcon`;

  return new (class KibanaInstance {
    async isOnInstance() {
      const pageId = await retry.try(() => testSubjects.find(SUBJ_INSTANCE_PAGE));
      return pageId !== null;
    }

    async getSummary() {
      return {
        transportAddress: await testSubjects.getVisibleText(SUBJ_SUMMARY_TRANSPORT_ADDRESS),
        osFreeMemory: await testSubjects.getVisibleText(SUBJ_SUMMARY_OS_FREE_MEMORY),
        version: await testSubjects.getVisibleText(SUBJ_SUMMARY_VERSION),
        uptime: await testSubjects.getVisibleText(SUBJ_SUMMARY_UPTIME),
        health: await testSubjects.getAttribute(SUBJ_SUMMARY_HEALTH, 'alt'),
      };
    }
  })();
}
