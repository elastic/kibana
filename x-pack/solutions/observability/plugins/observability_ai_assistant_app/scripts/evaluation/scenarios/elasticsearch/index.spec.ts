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
import { chatClient, esClient } from '../../services';

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

  describe('ML jobs', () => {
    before(async () => {
      // Create test index with sample data
      await esClient.indices.create({
        index: 'logs-test',
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            response_time: { type: 'float' },
          },
        },
      });

      // Index some sample documents
      const now = new Date();
      const bulkBody: any[] = [];
      for (let i = 0; i < 50; i++) {
        bulkBody.push({ index: { _index: 'logs-test' } });
        bulkBody.push({
          '@timestamp': new Date(now.getTime() - i * 60000).toISOString(), // 1 min apart
          response_time: Math.random() * 100,
        });
      }
      await esClient.bulk({ refresh: true, body: bulkBody });

      const mlJobRequest: MlPutJobRequest = {
        job_id: 'job_1',
        description: 'Detect anomalies in average response_time',
        analysis_config: {
          bucket_span: '15m',
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
          datafeed_id: 'datafeed-job_1',
          indices: ['logs-test'],
          query: { match_all: {} },
        },
      };

      await esClient.ml.putJob(mlJobRequest);

      await esClient.ml.openJob({ job_id: 'job_1' });
    });

    after(async () => {
      await esClient.ml.closeJob({ job_id: 'job_1', force: true });
      await esClient.ml.deleteJob({ job_id: 'job_1' });
      await esClient.indices.delete({ index: 'logs-test' });
    });

    it('returns a list of ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'List all ML jobs',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors or _ml/anomaly_detectors/_all',
        'Returns the list of ML jobs based on the response from the Elasticsearch function',
        'Includes job_1 in the list of ML jobs',
      ]);

      expect(result.passed).to.be(true);
    });
    it('returns the ML job stats', async () => {
      const conversation = await chatClient.complete({
        messages: 'What is the ML job stats?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors/_stats',
        'Returns the ML job stats based on the response from the Elasticsearch function',
        'Includes job_1 in the ML job stats',
      ]);

      expect(result.passed).to.be(true);
    });
    it('returns open ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'Which ML jobs are open?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors or _ml/anomaly_detectors/_all',
        'Returns the list of open ML jobs based on the response from the Elasticsearch function',
        'Includes job_1 in the list of open ML jobs',
      ]);

      expect(result.passed).to.be(true);
    });
    it('returns closed ML jobs', async () => {
      const conversation = await chatClient.complete({
        messages: 'Which ML jobs are closed?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors or _ml/anomaly_detectors/_all',
        'Returns the list of closed ML jobs based on the response from the Elasticsearch function',
        'Does not include job_1 in the list of closed ML jobs',
      ]);

      expect(result.passed).to.be(true);
    });
    it('returns specific ML job', async () => {
      const conversation = await chatClient.complete({
        messages: 'Can you tell me about job_1?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors/job_1',
        'Returns the details of job_1 based on the response from the Elasticsearch function',
        'Includes job_1 in the response',
      ]);

      expect(result.passed).to.be(true);
    });
    it('return ML job running status', async () => {
      const conversation = await chatClient.complete({
        messages: 'Is job_1 running?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors/job_1',
        'Determines if job_1 is open or closed based on the response from the Elasticsearch function',
        'Informs the user that job_1 is currently open',
      ]);

      expect(result.passed).to.be(true);
    });
    it('Can you check if there is any anomalies in .ml-anomalies* index in the last 3 hours ? and explain what the anomaly is about?', async () => {
      const conversation = await chatClient.complete({
        messages:
          'Can you check if there is any anomalies in logs-test index in the last 3 hours? and explain what the anomaly is about?',
        scope: 'all',
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the Elasticsearch function with method: GET and path: _ml/anomaly_detectors/_stats',
        'Returns the ML job stats based on the response from the Elasticsearch function',
        'Includes job_1 in the ML job stats',
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
