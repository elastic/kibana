/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { CONTEXT_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context/context';
import { chatClient, esClient, kibanaClient } from '../../services';

const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';

describe('Knowledge base', () => {
  describe('kb functions', () => {
    it('summarizes and recalls information', async () => {
      let conversation = await chatClient.complete({
        messages:
          'Remember that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
      });

      conversation = await chatClient.complete({
        conversationId: conversation.conversationId!,
        messages: conversation.messages.concat({
          content: 'What is this cluster used for?',
          role: MessageRole.User,
        }),
      });

      const result = await chatClient.evaluate(conversation, [
        'Calls the summarize function',
        'Effectively summarizes and remembers that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
        'Calls the "context" function to respond to What is this cluster used for?',
        'Effectively recalls that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
      ]);

      expect(result.passed).to.be(true);
    });

    after(async () => {
      await esClient.deleteByQuery({
        index: KB_INDEX,
        ignore_unavailable: true,
        query: {
          match: {
            text: {
              query: '*Observability AI Evaluation Framework*',
            },
          },
        },
      });
    });
  });

  describe('kb retrieval', () => {
    const testDocs = [
      {
        id: 'acme_teams',
        title: 'ACME DevOps Team Structure',
        text: 'ACME maintains three primary DevOps teams: Platform Infrastructure (responsible for cloud infrastructure and Kubernetes clusters), Application Operations (responsible for application deployments and monitoring), and Security Operations (responsible for security monitoring and compliance). Each team maintains a separate on-call rotation accessible via PagerDuty. The current on-call schedule is available in the #oncall Slack channel or through the PagerDuty integration in Kibana.',
      },
      {
        id: 'acme_monitoring',
        title: 'Alert Thresholds',
        text: 'Standard alert thresholds for ACME services are: API response time > 500ms (warning) or > 1s (critical), error rate > 1% (warning) or > 5% (critical), CPU usage > 80% (warning) or > 90% (critical), memory usage > 85% (warning) or > 95% (critical). Custom thresholds for specific services are documented in the service runbooks stored in Confluence under the "Service Specifications" space.',
      },
      {
        id: 'acme_infra',
        title: 'Database Infrastructure',
        text: 'Primary transactional data is stored in PostgreSQL clusters with read replicas in each region. Customer metadata is stored in MongoDB with M40 clusters in each region. Caching layer uses Redis Enterprise Cloud with 15GB instances. All database metrics are collected via Metricbeat with custom dashboards available under "ACME Databases" in Kibana. Database performance alerts are configured to notify the DBA team via the #db-alerts Slack channel.',
      },
    ];

    before(async () => {
      await kibanaClient.installKnowledgeBase();
      try {
        await esClient.deleteByQuery({
          index: KB_INDEX,
          ignore_unavailable: true,
          query: { match_all: {} },
          refresh: true,
        });
      } catch (error) {
        // ignore error
      }

      // Insert the test documents into KB
      await kibanaClient.callKibana(
        'post',
        { pathname: '/internal/observability_ai_assistant/kb/entries/import' },
        {
          entries: testDocs,
        }
      );
    });

    describe('when asking about DevOps teams', () => {
      let conversation: Awaited<ReturnType<typeof chatClient.complete>>;
      before(async () => {
        const prompt = 'What DevOps teams does we have and how is the on-call rotation managed?';
        conversation = await chatClient.complete({ messages: prompt });
      });

      it('retrieves one entry from the KB', async () => {
        const contextResponseMessage = conversation.messages.find(
          (msg) => msg.name === CONTEXT_FUNCTION_NAME
        )!;
        const { learnings } = JSON.parse(contextResponseMessage.content!);
        const firstLearning = learnings[0];

        expect(learnings.length).to.be(1);
        expect(firstLearning.llmScore).to.be.greaterThan(4);
        expect(firstLearning.id).to.be('acme_teams');
      });

      it('retrieves DevOps team structure and on-call information', async () => {
        const result = await chatClient.evaluate(conversation, [
          'Uses context function response to find information about ACME DevOps team structure',
          "Correctly identifies all three teams: Platform Infrastructure, Application Operations, and Security Operations and destcribes each team's responsibilities",
          'Mentions that on-call rotations are managed through PagerDuty and includes information about accessing the on-call schedule via Slack or Kibana',
          'Does not invent unrelated or hallucinated details not present in the KB',
        ]);

        expect(result.passed).to.be(true);
      });
    });

    it('retrieves monitoring thresholds and database infrastructure details', async () => {
      const prompt =
        'What are our standard alert thresholds for services and what database technologies do we use?';
      const conversation = await chatClient.complete({ messages: prompt });

      const result = await chatClient.evaluate(conversation, [
        'Uses context function response to find the correct documents about alert thresholds and database infrastructure',
        'Mentions the specific alert thresholds for API response time, error rate, CPU usage, and memory usage',
        'Identifies the primary database technologies: PostgreSQL, MongoDB, and Redis and mentions that database metrics are collected via Metricbeat',
        'Does not combine information incorrectly or hallucinate details not present in the KB',
      ]);

      expect(result.passed).to.be(true);
    });

    after(async () => {
      await esClient.deleteByQuery({
        index: KB_INDEX,
        ignore_unavailable: true,
        query: {
          match: {
            text: 'ACME',
          },
        },
        refresh: true,
      });
    });
  });
});
