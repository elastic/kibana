/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export default async function getRolledUpData(jobName, day) {
  return {
    index: `rollup-to-be`,
    body: {
      '_rollup.version': 2,
      '@timestamp.date_histogram.time_zone': 'UTC',
      '@timestamp.date_histogram.timestamp': day.toISOString(),
      '@timestamp.date_histogram.interval': '1000ms',
      '@timestamp.date_histogram._count': 1,
      '_rollup.id': jobName
    }
  };
}
