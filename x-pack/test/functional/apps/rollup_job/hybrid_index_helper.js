/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function mockRolledUpData(jobName, targetIndexName, day) {
  return {
    index: `${targetIndexName}`,
    body: {
      '_rollup.version': 2,
      '@timestamp.date_histogram.time_zone': 'UTC',
      '@timestamp.date_histogram.timestamp': day.toISOString(),
      '@timestamp.date_histogram.interval': '1000ms',
      '@timestamp.date_histogram._count': 1,
      '_rollup.id': jobName,
    },
  };
}

//This function just adds some stub indices that includes a timestamp and an arbritary metric. This is fine since we are not actually testing
//rollup functionality.
export function mockIndices(day, prepend) {
  return {
    index: `${prepend}-${day.format('MM-DD-YYYY')}`,
    body: {
      '@timestamp': day.toISOString(),
      foo_metric: 1,
    },
  };
}
