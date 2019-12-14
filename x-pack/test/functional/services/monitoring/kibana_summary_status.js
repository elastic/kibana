/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringKibanaSummaryStatusProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SUMMARY = 'kibanaClusterStatus';
  const SUBJ_SUMMARY_INSTANCES = `${SUBJ_SUMMARY} > instances`;
  const SUBJ_SUMMARY_MEMORY = `${SUBJ_SUMMARY} > memory`;
  const SUBJ_SUMMARY_REQUESTS = `${SUBJ_SUMMARY} > requests`;
  const SUBJ_SUMMARY_CONNECTIONS = `${SUBJ_SUMMARY} > connections`;
  const SUBJ_SUMMARY_MAX_RESPONSE_TIME = `${SUBJ_SUMMARY} > maxResponseTime`;
  const SUBJ_SUMMARY_HEALTH = `${SUBJ_SUMMARY} > statusIcon`;

  return new (class KibanaSummaryStatus {
    async getContent() {
      return {
        instances: await testSubjects.getVisibleText(SUBJ_SUMMARY_INSTANCES),
        memory: await testSubjects.getVisibleText(SUBJ_SUMMARY_MEMORY),
        requests: await testSubjects.getVisibleText(SUBJ_SUMMARY_REQUESTS),
        connections: await testSubjects.getVisibleText(SUBJ_SUMMARY_CONNECTIONS),
        maxResponseTime: await testSubjects.getVisibleText(SUBJ_SUMMARY_MAX_RESPONSE_TIME),
        health: await testSubjects.getAttribute(SUBJ_SUMMARY_HEALTH, 'alt'),
      };
    }
  })();
}
