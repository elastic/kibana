/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/inference_endpoint';
import { uniq } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import {
  clearKnowledgeBase,
  deleteInferenceEndpoint,
  deleteKnowledgeBaseModel,
  importTinyElserModel,
  setupKnowledgeBase,
  waitForKnowledgeBaseReady,
} from '../../knowledge_base/helpers';
import { setAdvancedSettings } from '../../utils/advanced_settings';

const customSearchConnectorIndex = 'animals_kb';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const ml = getService('ml');

  describe('recall', function () {
    before(async () => {
      await addSampleDocsToInternalKb(getService);
      await addSampleDocsToCustomIndex(getService);
    });

    after(async () => {
      await deleteKnowledgeBaseModel(ml);
      await deleteInferenceEndpoint({ es });
      await clearKnowledgeBase(es);
      // clear custom index
      await es.indices.delete({ index: customSearchConnectorIndex }, { ignore: [404] });
    });

    describe('GET /internal/observability_ai_assistant/functions/recall', () => {
      it('produces unique scores for each doc', async () => {
        const entries = await recall('What happened during the database outage?');
        const uniqueScores = uniq(entries.map(({ score }) => score));
        expect(uniqueScores.length).to.be.greaterThan(1);
        expect(uniqueScores.length).to.be(6);
      });

      it('returns results from both search connectors and internal kb', async () => {
        const entries = await recall('What happened during the database outage?');
        const docTypes = uniq(entries.map(({ id }) => id.split('_')[0]));
        expect(docTypes).to.eql(['animal', 'technical']);
      });

      it('returns different result order for different queries', async () => {
        const databasePromptEntries = await recall('What happened during the database outage?');
        const animalPromptEntries = await recall('Do you have knowledge about animals?');

        expect(databasePromptEntries.length).to.be(6);
        expect(animalPromptEntries.length).to.be(6);

        expect(databasePromptEntries.map(({ id }) => id)).not.to.eql(
          animalPromptEntries.map(({ id }) => id)
        );
      });
    });
  });

  async function recall(prompt: string) {
    const { body, status } = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/functions/recall',
      params: {
        body: {
          queries: [{ text: prompt }],
        },
      },
    });

    expect(status).to.be(200);

    return body.entries;
  }
}

async function addSampleDocsToInternalKb(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const log = getService('log');
  const ml = getService('ml');
  const retry = getService('retry');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const sampleDocs = [
    {
      id: 'technical_db_outage_slow_queries',
      title: 'Database Outage: Slow Query Execution',
      text: 'The production database experienced a significant slowdown at 03:15 AM UTC, leading to increased response times across all services. A spike in slow queries was identified in the logs, with 90% of queries exceeding the 2-second threshold. Initial investigation showed that a new indexing strategy deployed during the last release caused a conflict with existing data models. Root cause analysis revealed a missing index optimization on one of the most queried tables, leading to excessive disk I/O. After reindexing and updating the query plan, the issue was resolved and performance returned to normal. Actionable insight: Ensure pre-release load testing covers edge cases related to database schema changes.',
    },
    {
      id: 'technical_api_gateway_timeouts',
      title: 'Service Timeout: API Gateway Bottleneck',
      text: 'At 10:45 AM UTC, the API Gateway began timing out, resulting in a 500 status code for all incoming requests. Traces from the distributed tracing system showed a high latency spike at the gateway level, with requests waiting on the upstream service. Logs indicated a 50% increase in request volume after a recent deployment, overwhelming the rate-limiting mechanisms in place. The issue was traced to an insufficient autoscaling configuration on the upstream service, which failed to scale up during the traffic surge. After adjusting autoscaling policies and re-deploying the gateway, the issue was resolved. Actionable insight: Review and adjust autoscaling configurations based on traffic patterns and deployment strategies.',
    },
    {
      id: 'technical_cache_misses_thirdparty_api',
      title: 'Cache Misses and Increased Latency: Third-Party API Failure',
      text: 'At 04:30 PM UTC, a sudden spike in cache misses and increased latency was observed across several critical services. ',
    },
  ];

  await importTinyElserModel(ml);
  await setupKnowledgeBase(observabilityAIAssistantAPIClient);
  await waitForKnowledgeBaseReady({ observabilityAIAssistantAPIClient, log, retry });

  await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/kb/entries/import',
    params: {
      body: {
        entries: sampleDocs,
      },
    },
  });
}

async function addSampleDocsToCustomIndex(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const sampleDocs = [
    {
      id: 'animal_elephants_social_structure',
      title: 'Elephants and Their Social Structure',
      text: 'Elephants are highly social animals that live in matriarchal herds led by the oldest female. These animals communicate through low-frequency sounds, called infrasound, that travel long distances. They are known for their intelligence, strong memory, and deep emotional bonds with each other.',
    },
    {
      id: 'animal_cheetah_life_speed',
      title: 'The Life of a Cheetah',
      text: 'Cheetahs are the fastest land animals, capable of reaching speeds up to 60 miles per hour in short bursts. They rely on their speed to catch prey, such as gazelles. Unlike other big cats, cheetahs cannot roar, but they make distinctive chirping sounds, especially when communicating with their cubs.',
    },
    {
      id: 'animal_whale_migration_patterns',
      title: 'Whales and Their Migration Patterns',
      text: 'Whales are known for their long migration patterns, traveling thousands of miles between feeding and breeding grounds.',
    },
  ];

  // create index with semantic_text mapping for `text` field
  log.info('Creating custom index with sample animal docs...');
  await es.indices.create({
    index: customSearchConnectorIndex,
    mappings: {
      properties: {
        title: { type: 'text' },
        text: { type: 'semantic_text', inference_id: AI_ASSISTANT_KB_INFERENCE_ID },
      },
    },
  });

  log.info('Indexing sample animal docs...');
  // ingest sampleDocs
  await Promise.all(
    sampleDocs.map(async (doc) => {
      const { id, ...restDoc } = doc;
      return es.index({
        refresh: 'wait_for',
        index: customSearchConnectorIndex,
        id,
        body: restDoc,
      });
    })
  );

  // update the advanced settings (`observability:aiAssistantSearchConnectorIndexPattern`) to include the custom index
  await setAdvancedSettings(supertest, {
    'observability:aiAssistantSearchConnectorIndexPattern': customSearchConnectorIndex,
  });
}
