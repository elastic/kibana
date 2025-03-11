/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AI_ASSISTANT_KB_INFERENCE_ID } from '@kbn/observability-ai-assistant-plugin/server/service/inference_endpoint';
import { first, uniq } from 'lodash';
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
        expect(uniqueScores.length).to.be(8);
      });

      it('returns results from both search connectors and internal kb', async () => {
        const entries = await recall('What happened during the database outage?');
        const docTypes = uniq(entries.map(({ id }) => id.split('_')[0]));
        expect(docTypes).to.eql(['animal', 'technical']);
      });

      it('returns entries in a consistent order', async () => {
        const entries = await recall('whales');

        expect(entries.map(({ id, score }) => `${score} - ${id}`)).to.eql([
          '1.4052824 - animal_whale_migration_patterns',
          '0.021248544 - animal_elephants_social_structure',
          '0.021132138 - technical_api_gateway_timeouts',
          '0.020981446 - technical_cache_misses_thirdparty_api',
          '0.020939047 - animal_cheetah_life_speed',
          '0.020622106 - technical_db_outage_slow_queries',
          '0.020130742 - animal_giraffe_habitat_feeding',
          '0.018531876 - animal_penguin_antarctic_adaptations',
        ]);
      });

      it('returns the "Cheetah" entry from search connectors as the top result', async () => {
        const entries = await recall('Cheetah');
        const { text, score } = first(entries)!;

        // search connector entries have their entire doc stringified in `text` field
        const parsedDoc = JSON.parse(text) as { title: string; text: string };
        expect(parsedDoc.title).to.eql('The Life of a Cheetah');
        expect(score).to.greaterThan(1);
      });

      it('returns different result order for different queries', async () => {
        const databasePromptEntries = await recall('What happened during the database outage?');
        const animalPromptEntries = await recall('Do you have knowledge about animals?');

        expect(databasePromptEntries.length).to.be(8);
        expect(animalPromptEntries.length).to.be(8);

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
      text: 'At 03:15 AM UTC, the production database experienced a significant outage, leading to slow query execution and increased response times across multiple services. A surge in database load was detected, with 90% of queries exceeding 2 seconds. A detailed log analysis pointed to locking issues within the transaction queue and inefficient index usage.',
    },
    {
      id: 'technical_api_gateway_timeouts',
      title: 'Service Timeout: API Gateway Bottleneck',
      text: 'At 10:45 AM UTC, the API Gateway encountered a timeout issue, causing a 500 error for all incoming requests. Detailed traces indicated a significant bottleneck at the gateway level, where requests stalled while waiting for upstream service responses. The upstream service was overwhelmed due to a sudden spike in inbound traffic and failed to release resources promptly.',
    },
    {
      id: 'technical_cache_misses_thirdparty_api',
      title: 'Cache Misses and Increased Latency: Third-Party API Failure',
      text: 'At 04:30 PM UTC, a dramatic increase in cache misses and latency was observed. The failure of a third-party API prevented critical data from being cached, leading to unnecessary re-fetching of resources from external sources. This caused significant delays in response times, with up to 10-second delays in some key services.',
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
    {
      id: 'animal_giraffe_habitat_feeding',
      title: 'Giraffes: Habitat and Feeding Habits',
      text: 'Giraffes are the tallest land animals, with long necks that help them reach leaves high up in trees. They live in savannas and grasslands, where they feed on leaves, twigs, and fruits from acacia trees.',
    },
    {
      id: 'animal_penguin_antarctic_adaptations',
      title: 'Penguins and Their Antarctic Adaptations',
      text: 'Penguins are flightless birds that have adapted to life in the cold Antarctic environment. They have a thick layer of blubber to keep warm, and their wings have evolved into flippers for swimming in the icy waters.',
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

// Clear data before running tests
// this is useful for debugging purposes
// @ts-ignore
async function clearBefore(getService: DeploymentAgnosticFtrProviderContext['getService']) {
  const log = getService('log');
  const ml = getService('ml');
  const es = getService('es');

  await deleteKnowledgeBaseModel(ml).catch(() => {
    log.error('Failed to delete knowledge base model');
  });
  await deleteInferenceEndpoint({ es }).catch(() => {
    log.error('Failed to delete inference endpoint');
  });
  await clearKnowledgeBase(es).catch(() => {
    log.error('Failed to clear knowledge base');
  });
  await es.indices.delete({ index: customSearchConnectorIndex }, { ignore: [404] }).catch(() => {
    log.error('Failed to clear custom index');
  });
}
