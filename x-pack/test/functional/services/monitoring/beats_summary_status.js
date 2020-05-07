/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function MonitoringBeatsSummaryStatusProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SUMMARY = 'beatsSummaryStatus';
  const SUBJ_TYPES_COUNTS = `${SUBJ_SUMMARY} > typeCount`;

  const SUBJ_TOTAL_EVENTS = `${SUBJ_SUMMARY} > totalEvents`;
  const SUBJ_BYTES_SENT = `${SUBJ_SUMMARY} > bytesSent`;

  return new (class BeatsSummaryStatus {
    async getContent() {
      const counts = await testSubjects.getAttributeAll(SUBJ_TYPES_COUNTS, 'data-test-type-count');

      const countsByType = counts.reduce((accum, text) => {
        const [type, count] = text.split(':');
        return {
          ...accum,
          [type.toLowerCase()]: parseInt(count, 10),
        };
      }, {});

      return {
        ...countsByType,
        totalEvents: await testSubjects.getVisibleText(SUBJ_TOTAL_EVENTS),
        bytesSent: await testSubjects.getVisibleText(SUBJ_BYTES_SENT),
      };
    }
  })();
}
