/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const generateOperationDataConfig = {
  ES_SEARCH_DURATION: 100,
  ES_SEARCH_UNKNOWN_RATE: 5,
  ES_BULK_RATE: 20,
  ES_SEARCH_SUCCESS_RATE: 4,
  ES_SEARCH_FAILURE_RATE: 1,
  ES_BULK_DURATION: 1000,
  REDIS_SET_RATE: 10,
  REDIS_SET_DURATION: 10,
};

export async function generateOperationData({
  start,
  end,
  apmSynthtraceEsClient,
}: {
  start: number;
  end: number;
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
}) {
  const synthGoInstance = apm
    .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
    .instance('instance-a');
  const synthJavaInstance = apm
    .service({ name: 'synth-java', environment: 'development', agentName: 'java' })
    .instance('instance-a');

  const interval = timerange(start, end).interval('1m');

  return await apmSynthtraceEsClient.index([
    interval
      .rate(generateOperationDataConfig.ES_SEARCH_UNKNOWN_RATE)
      .generator((timestamp) =>
        synthGoInstance
          .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
          .destination('elasticsearch')
          .timestamp(timestamp)
          .duration(generateOperationDataConfig.ES_SEARCH_DURATION)
      ),
    interval
      .rate(generateOperationDataConfig.ES_SEARCH_SUCCESS_RATE)
      .generator((timestamp) =>
        synthGoInstance
          .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
          .destination('elasticsearch')
          .timestamp(timestamp)
          .success()
          .duration(generateOperationDataConfig.ES_SEARCH_DURATION)
      ),
    interval
      .rate(generateOperationDataConfig.ES_SEARCH_FAILURE_RATE)
      .generator((timestamp) =>
        synthGoInstance
          .span({ spanName: '/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
          .destination('elasticsearch')
          .timestamp(timestamp)
          .failure()
          .duration(generateOperationDataConfig.ES_SEARCH_DURATION)
      ),
    interval
      .rate(generateOperationDataConfig.ES_BULK_RATE)
      .generator((timestamp) =>
        synthJavaInstance
          .span({ spanName: '/_bulk', spanType: 'db', spanSubtype: 'elasticsearch' })
          .destination('elasticsearch')
          .timestamp(timestamp)
          .duration(generateOperationDataConfig.ES_BULK_DURATION)
      ),
    interval
      .rate(generateOperationDataConfig.REDIS_SET_RATE)
      .generator((timestamp) =>
        synthJavaInstance
          .span({ spanName: 'SET', spanType: 'db', spanSubtype: 'redis' })
          .destination('redis')
          .timestamp(timestamp)
          .duration(generateOperationDataConfig.REDIS_SET_DURATION)
      ),
  ]);
}
