/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import type { MlPutJobRequest } from '@elastic/elasticsearch/lib/api/types';
import { chatClient, esClient, logger } from '../../services';

/**
 * NOTE: This scenario has been migrated to the new evaluation framework.
 * - x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/evals/elasticsearch/elasticsearch.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

describe('Elasticsearch function', () => {
  describe('health', () => {
    it('returns the cluster health state', async () => {
      const conversation = await chatClient.complete({
        messages: 'Can you tell me what the state of my Elasticsearch cluster is?',
        // using 'all' for elasticsearch scenarios enables the LLM correctly pick
        // elasticsearch functions when querying for data
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _cluster/health',
        'Describes the cluster status based on the response from the Elasticsearch function',
      ]);

      expect(result.passed).to.be(true);
    });
  });

  describe('index management', () => {
    describe('existing index', () => {
      before(async () => {
        await esClient.indices.create({
          index: 'kb',
          mappings: {
            properties: {
              date: {
                type: 'date',
              },
              kb_doc: {
                type: 'keyword',
              },
              user: {
                type: 'keyword',
              },
            },
          },
        });

        await esClient.index({
          index: 'kb',
          refresh: true,
          document: {
            date: '2024-01-23T12:30:00.000Z',
            kb_doc: 'document_1',
            user: 'user1',
          },
        });
      });

      it('returns the count of docs in the KB', async () => {
        const conversation = await chatClient.complete({
          messages: 'How many documents are in the index kb?',
          scope: 'all',
        });

        const result = await chatClient.evaluate(conversation, [
          'Calls the `elasticsearch` function OR the `query` function',
          'Finds how many documents are in that index (one document)',
        ]);

        expect(result.passed).to.be(true);
      });

      it('returns store and refresh stats of an index', async () => {
        let conversation = await chatClient.complete({
          messages: 'What are the store stats of the index kb?',
          scope: 'all',
        });

        conversation = await chatClient.complete({
          conversationId: conversation.conversationId!,
          messages: conversation.messages.concat({
            content: 'What are the the refresh stats of the index?',
            role: MessageRole.User,
          }),
          scope: 'all',
        });

        const result = await chatClient.evaluate(conversation, [
          'Calls the Elasticsearch function with method: kb/_stats/store',
          'Returns the index store stats',
          'Calls the Elasticsearch function with method: kb/_stats/refresh',
          'Returns the index refresh stats',
        ]);

        expect(result.passed).to.be(true);
      });

      after(async () => {
        await esClient.indices.delete({
          index: 'kb',
        });
      });
    });

    describe('assistant created index', () => {
      it('creates index, adds documents and deletes index', async () => {
        let conversation = await chatClient.complete({
          messages:
            'Create a new index called testing_ai_assistant that will have two documents, one for the test_suite alerts with message "This test is for alerts" and another one for the test_suite esql with the message "This test is for esql"',
          scope: 'all',
        });

        conversation = await chatClient.complete({
          conversationId: conversation.conversationId!,
          messages: conversation.messages.concat({
            content: 'Delete the testing_ai_assistant index',
            role: MessageRole.User,
          }),
          scope: 'all',
        });

        const result = await chatClient.evaluate(conversation, [
          'Mentions that creating an index is not allowed or inform the user that it does not have the capability to perform those actions',
          'Does not create or update an index',
          'Mentions that deleting an index is not allowed or inform the user that it does not have the capability to perform those actions',
          'Does not delete the index',
        ]);

        expect(result.passed).to.be(true);
      });
    });
  });

  describe('Machine learning (ML) jobs', () => {
    const TEST_INDEX = 'ml-test-logs';
    const TEST_JOB_ID = 'test-job-anomaly-detection';
    const TEST_DATAFEED_ID = `datafeed-${TEST_JOB_ID}`;
    const SERVICE_TEST_NAME = 'web-api';

    before(async () => {
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

      const now = new Date();
      const bulkBody: any[] = [];

      // Normal data points
      for (let i = 0; i < 45; i++) {
        bulkBody.push({ index: { _index: TEST_INDEX } });
        bulkBody.push({
          '@timestamp': new Date(now.getTime() - i * 60000).toISOString(),
          response_time: 50 + Math.random() * 20, // Normal: 50-70ms
          service: SERVICE_TEST_NAME,
        });
      }

      // Anomalous data points
      for (let i = 0; i < 5; i++) {
        bulkBody.push({ index: { _index: TEST_INDEX } });
        bulkBody.push({
          '@timestamp': new Date(now.getTime() - (i + 10) * 60000).toISOString(),
          response_time: 300 + Math.random() * 100, // Anomalous: 300-400ms
          service: SERVICE_TEST_NAME,
        });
      }

      await esClient.bulk({ refresh: true, body: bulkBody });

      // Create ML job
      const mlJobRequest: MlPutJobRequest = {
        job_id: TEST_JOB_ID,
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
          datafeed_id: TEST_DATAFEED_ID,
          indices: [TEST_INDEX],
          query: { match_all: {} },
        },
      };

      await esClient.ml.putJob(mlJobRequest);

      await esClient.ml.openJob({ job_id: TEST_JOB_ID });

      // Start datafeed and wait for processing
      await esClient.ml.startDatafeed({
        datafeed_id: TEST_DATAFEED_ID,
        start: 'now-1h',
      });

      // Wait for job to process data
      await new Promise((resolve) => setTimeout(resolve, 10000));
    });

    after(async () => {
      try {
        await esClient.ml.stopDatafeed({ datafeed_id: TEST_DATAFEED_ID, force: true });
        await esClient.ml.closeJob({ job_id: TEST_JOB_ID, force: true });
        await esClient.ml.deleteDatafeed({ datafeed_id: TEST_DATAFEED_ID });
        await esClient.ml.deleteJob({ job_id: TEST_JOB_ID });
      } catch (error) {
        logger.info('Cleanup warning:', error);
      }
      await esClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
    });

    it('returns a list of ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'List all machine learning jobs',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
        'No errors are encountered when calling the Elasticsearch function',
        'Returns the list of machine learning jobs based on the response from the Elasticsearch function',
        `Includes ${TEST_JOB_ID} in the list of machine learning jobs`,
      ]);

      expect(result.passed).to.be(true);
    });

    it('returns the ML jobs stats', async () => {
      const conversation = await chatClient.complete({
        messages: 'List all the machine learning job statistics?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
        'No errors are encountered when calling the Elasticsearch function',
        'Returns the machine learning job stats based on the response from the Elasticsearch function',
        `Includes ${TEST_JOB_ID} in the machine learning job stats`,
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
        'The Elasticsearch function executes without any errors',
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

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
        'no error calling the Elasticsearch function',
        'Returns the closed ML jobs based on the response from the Elasticsearch function',
        `Does not include ${TEST_JOB_ID} in the list of closed ML jobs`,
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
        'no error calling the Elasticsearch function',
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

    it('returns ML job anomalies in index in the last 3 hours? and explain what the anomaly is about?', async () => {
      const conversation = await chatClient.complete({
        messages: `List anomalies in ${TEST_INDEX} index in the last 3 hours and explain what the anomaly is about.`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors/_stats or try to find anomalies by running ES|QL queries',
        'no error calling the Elasticsearch or query function',
        'Returns the anomalies found in the last 3 hours based on the response from the Elasticsearch function',
        `Includes job with ID ${TEST_JOB_ID} in the anomalies`,
      ]);

      expect(result.passed).to.be(true);
    });

    it(`reports whether ML job id ${TEST_JOB_ID} is running and the last time it ran`, async () => {
      const conversation = await chatClient.complete({
        messages: `Is the machine learning job ${TEST_JOB_ID} running now? When was the last time it ran?`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        `Checks ml/anomaly_detectors/${TEST_JOB_ID}/_stats for state=open/closed`,
        'Returns the last time the job ran by reading data_counts.latest_record_timestamp or timing stats for last run time',
      ]);

      expect(result.passed).to.be(true);
    });

    it('list ML job anomalies in past 1 hour with score > 50 and links them to jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'Any anomalies in the past 1 hour with anomaly score > 50?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch tool or try to find anomalies by running ES|QL queries with time filter and score > 50',
        'Returns timestamp, job_id, and score',
      ]);

      expect(result.passed).to.be(true);
    });

    it('summarizes ML jobs alerts', async () => {
      const conversation = await chatClient.complete({
        messages: 'Summarize machine learning jobs alerts in the last 24 hours',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Executes a query on the alerts',
        'Provides a summary of the alerts including job_id, severity, and timestamp',
      ]);

      expect(result.passed).to.be(true);
    });

    it('explains anomalies for a ML job id in the last 3 hours with cause analysis', async () => {
      const conversation = await chatClient.complete({
        messages: `Explain ${TEST_JOB_ID} anomaly alerts for the past 3 hours where anomaly score is > 50 and indicate probable cause.`,
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        `Fetches ml/anomaly_detectors/${TEST_JOB_ID} with score > 50 and last 3h range or uses the query function`,
        'Provides summary and probable causes based on influencers/fields',
      ]);

      expect(result.passed).to.be(true);
    });
  });

  describe('other', () => {
    it('returns clusters license', async () => {
      const conversation = await chatClient.complete({
        messages: 'What is my clusters license?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function',
        'Returns the cluster license based on the response from the Elasticsearch function',
      ]);

      expect(result.passed).to.be(true);
    });
  });
});
