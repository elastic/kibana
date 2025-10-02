/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import type { MlGetJobsResponse, MlPutJobRequest } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { chatClient, esClient, kibanaClient, logger, synthtraceEsClients } from '../../services';
import {
  cleanupMachineLearningJobs,
  setupMLJobAndDatafeed,
} from '../../utils/machine_learning_jobs';
import { loadSampleData } from '../../utils/load_sample_data';

describe('Machine learning (ML)', () => {
  const TEST_INDEX = 'my-index-000001';
  const TEST_JOB_ID = 'test-job-anomaly-detection';
  const TEST_DATAFEED_ID = `datafeed-${TEST_JOB_ID}`;
  const SERVICE_TEST_NAME = 'web-api';
  const TEST_JOB_ID_2 = 'response_time_anomaly_detection';
  const TEST_DATAFEED_ID_2 = `datafeed-${TEST_JOB_ID_2}`;
  let jobs: MlGetJobsResponse = { count: 0, jobs: [] };
  let jobIds: string[] = [];
  before(async () => {
    await cleanupMachineLearningJobs({ esClient, logger });
    await esClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
    await synthtraceEsClients.apmSynthtraceEsClient.clean();
    const logsSampleDataIndex = await loadSampleData({
      logger,
      kibanaClient,
      sampleDataId: 'logs',
    });
    // Get time range for the sample data
    const timeFieldRangeResponse = await kibanaClient.callKibana<{
      success: boolean;
      start: number;
      end: number;
    }>(
      'POST',
      {
        pathname: '/internal/ml/fields_service/time_field_range',
      },
      {
        index: logsSampleDataIndex,
        timeFieldName: 'timestamp',
        query: {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
            must_not: [
              {
                term: {
                  _tier: {
                    value: 'data_frozen',
                  },
                },
              },
            ],
          },
        },
        runtimeMappings: {
          hour_of_day: {
            type: 'long',
            script: {
              source: "emit(doc['timestamp'].value.getHour());",
            },
          },
        },
      },
      {
        headers: { 'elastic-api-version': 1 },
      }
    );
    logger.debug('Creating ML jobs from logs sample data');
    await kibanaClient.callKibana(
      'POST',
      {
        pathname: '/internal/ml/modules/setup/sample_data_weblogs',
      },
      {
        prefix: 'test_',
        indexPatternName: logsSampleDataIndex,
        useDedicatedIndex: false,
        startDatafeed: true,
        start: timeFieldRangeResponse.data.start,
        end: timeFieldRangeResponse.data.end,
      },
      {
        headers: { 'elastic-api-version': 1 },
      }
    );
    logger.debug('Generating APM data');

    const range = timerange(moment().subtract(1, 'days'), moment());

    const myServiceInstance = apm
      .service({ name: SERVICE_TEST_NAME, environment: 'production', agentName: 'nodejs' })
      .instance('my-instance');

    // Normal transactions: same duration 5 ms
    const normalDocs = range
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        myServiceInstance
          .transaction('GET /api')
          .duration(5) // duration in ms
          .timestamp(timestamp)
      );
    await synthtraceEsClients.apmSynthtraceEsClient.index(normalDocs);
    const ML_JOB_CONFIG_1: MlPutJobRequest = {
      job_id: TEST_JOB_ID,
      description: 'Detect anomalies in APM transaction duration',
      analysis_config: {
        bucket_span: '5m',
        detectors: [{ function: 'mean', field_name: 'transaction.duration.us' }],
      },
      data_description: { time_field: '@timestamp' },
      datafeed_config: {
        datafeed_id: TEST_DATAFEED_ID,
        indices: ['traces-apm*'],
        query: { match: { 'service.name': SERVICE_TEST_NAME } },
      },
    };

    await setupMLJobAndDatafeed(esClient, ML_JOB_CONFIG_1, TEST_JOB_ID, TEST_DATAFEED_ID, 'now-1h');

    await esClient.indices.create({
      index: TEST_INDEX,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          response_time: { type: 'float' },
          service: { type: 'keyword' },
        },
      },
    });

    const ML_JOB_CONFIG_2 = {
      job_id: TEST_JOB_ID_2,
      description: 'Detect anomalies in average response_time',
      analysis_config: {
        bucket_span: '5m',
        detectors: [
          {
            function: 'mean',
            field_name: 'response_time',
          },
        ],
      },
      data_description: {
        time_field: '@timestamp',
      },
      datafeed_config: {
        datafeed_id: TEST_DATAFEED_ID_2,
        indices: [TEST_INDEX],
        query: { match_all: {} },
      },
    };

    await setupMLJobAndDatafeed(
      esClient,
      ML_JOB_CONFIG_2,
      TEST_JOB_ID_2,
      TEST_DATAFEED_ID_2,
      'now-1h'
    );

    await esClient.ml.closeJob({ job_id: TEST_JOB_ID_2, force: true });

    jobs = await esClient.ml.getJobs();
    jobIds = jobs.jobs.map((job) => job.job_id);
  });

  after(async () => {
    await cleanupMachineLearningJobs({ esClient, logger });
    await esClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
    await synthtraceEsClients.apmSynthtraceEsClient.clean();
  });

  describe.skip('Machine learning (ML) jobs', () => {
    it('returns the ML jobs configuration', async () => {
      const conversation = await chatClient.complete({
        messages:
          'List all machine learning jobs with details such as id, state, and description, datafeed indices, influencers and bucket span',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
        'Returns the list of machine learning jobs based on the response from the Elasticsearch function, Each job includes id, state, description, datafeed indices, influencers, and bucket_span',
        `Includes ${jobIds.join(', ')} in the list of machine learning jobs`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns the ML jobs stats details', async () => {
      const conversation = await chatClient.complete({
        messages:
          'List all the machine learning job statistics, including processed record counts, model size stats, timing/bucket counts, memory status and current node information.',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors/_stats',
        `Returns the list of machine learning jobs stats based on the response from the Elasticsearch function, Each job includes processed_record_count, model_size_stats , bucket_count, memory_status, and node information`,
        `Includes ${jobIds.join(', ')} in the list of machine learning jobs stats`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns open ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'Which machine learning jobs are open?',
        scope: 'all',
      });
      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
        'Returns the open machine learning jobs based on the response from the Elasticsearch function',
        `Includes ${TEST_JOB_ID} in the list of open machine learning jobs`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns closed ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'Which machine learning jobs are closed?',
        scope: 'all',
      });
      const closedJobIds = jobIds.filter((jobId) => jobId !== TEST_JOB_ID);

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
        'Returns the closed ML jobs based on the response from the Elasticsearch function',
        `Includes ${closedJobIds.join(', ')} in the list of closed machine learning jobs`,
        `Does not include ${TEST_JOB_ID} in the list of closed ML jobs`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns failed or stopped ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'List all failed or stopped machine learning jobs',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path containing: ml/anomaly_detectors',
        'Filters jobs whose state is failed or stopped/closed',
        'Returns those jobs in the response',
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns specific ML job status', async () => {
      const conversation = await chatClient.complete({
        messages: `What is the status of machine learning job with the ID ${TEST_JOB_ID}?`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        `Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors/${TEST_JOB_ID}`,
        'The Elasticsearch function executes without any errors',
        `Returns the details of ML job id ${TEST_JOB_ID} based on the response from the Elasticsearch function`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('lists open ML jobs for specific apps', async () => {
      const conversation = await chatClient.complete({
        messages: `List all open machine learning jobs for app ${SERVICE_TEST_NAME}`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors or uses the query function',
        'Filters jobs by the service name',
        `Includes ${TEST_JOB_ID} in the list of open machine learning jobs`,
      ]);

      expect(result.passed).to.be(true);
    });

    it(`reports whether ML job ids ${TEST_JOB_ID} and ${TEST_JOB_ID_2} is running and the last time it ran`, async () => {
      const conversation = await chatClient.complete({
        messages: `Are the machine learning jobs ${TEST_JOB_ID} and ${TEST_JOB_ID_2} running now? When was the last time it ran?`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        `Checks ml/anomaly_detectors/${TEST_JOB_ID}/_stats for state=open/closed`,
        `Checks ml/anomaly_detectors/${TEST_JOB_ID_2}/_stats for state=open/closed`,
        'Returns the last time the job ran by reading data_counts.latest_record_timestamp or timing stats for last run time',
      ]);

      expect(result.passed).to.be(true);
    });
  });

  describe('Anomaly detection', () => {
    it('returns anomalies and explain what the anomaly is about?', async () => {
      const conversation = await chatClient.complete({
        messages: `List anomalies and explain what the anomaly is about.`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function or try to find anomalies by running ES|QL queries',
        'The Elasticsearch or query function executes without any errors',
        'Returns a list of anomalies found based on the response from the Elasticsearch function, there are more than 0 anomalies',
        `Includes job with ID ${jobIds.join(', ')} in the anomalies`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns anomalies in indices and explain what the anomaly is about?', async () => {
      const listJobIds = jobIds.join(', ');
      const conversation = await chatClient.complete({
        messages: `List anomalies in ${listJobIds} indices and explain what the anomaly is about.`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function or try to find anomalies by running ES|QL queries',
        'The Elasticsearch or query function executes without any errors',
        `Returns a list of anomalies found based on the response from the Elasticsearch function. Includes job with ID ${listJobIds} in the anomalies, there are more than 0 anomalies`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('list ML job anomalies with score > 50 and links them to jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'Any anomalies with anomaly score > 50? List them with job id.',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch tool or try to find anomalies by running ES|QL queries with time filter and score > 50',
        'Returns timestamp, job_id, and score. Links anomalies to their respective ML jobs. There are more than 0 anomalies',
      ]);

      expect(result.passed).to.be(true);
    });

    it('explains anomalies for a ML job id with cause analysis', async () => {
      const conversation = await chatClient.complete({
        messages: `Explain ${TEST_JOB_ID} anomaly alerts and indicate probable cause.`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        `Fetches ml/anomaly_detectors/${TEST_JOB_ID} or uses the query function`,
        'Provides summary and probable causes based on influencers/fields',
      ]);

      expect(result.passed).to.be(true);
    });

    it('explains anomalies for a specific application with probable cause', async () => {
      const conversation = await chatClient.complete({
        messages: `Explain ${SERVICE_TEST_NAME} anomaly alerts and indicate the probable cause.`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Fetches recent anomalies for the given service/application',
        'Analyzes influencer fields to infer probable cause',
        'Returns a summary of anomalies with likely causes',
      ]);

      expect(result.passed).to.be(true);
    });

    it('performs root cause analysis on the top influencer for anomalies', async () => {
      const conversation = await chatClient.complete({
        messages: 'determine the top influencer field and value responsible for anomalies.',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        `Queries ml/anomaly_detectors/_results or uses the query function to fetch recent anomalies`,
        'Identifies highest influencer_score field/value',
        'Provides reasoning of probable root cause',
      ]);

      expect(result.passed).to.be(true);
    });
  });

  describe('Alerts AND summaries', () => {
    it('summarizes ML jobs alerts', async () => {
      const conversation = await chatClient.complete({
        messages: 'Summarize machine learning jobs alerts',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Executes a query on the ML jobs alerts',
        'Provides a summary of the alerts including job_id, severity, and timestamp',
      ]);

      expect(result.passed).to.be(true);
    });

    it('lists ML jobs alerts in the past hour with severity', async () => {
      const conversation = await chatClient.complete({
        messages: 'Any alerts raised for the past 1 hour? List them with job id and severity.',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Executes a query on the ML alerts index or uses the alerting API',
        'Filters by timestamp within the last 1 hour',
        'Returns job_id and severity',
      ]);

      expect(result.passed).to.be(true);
    });
  });
});
