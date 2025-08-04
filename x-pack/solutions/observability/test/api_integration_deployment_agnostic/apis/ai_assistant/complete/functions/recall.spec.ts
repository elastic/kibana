/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, uniq } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  clearKnowledgeBase,
  addSampleDocsToInternalKb,
  addSampleDocsToCustomIndex,
} from '../../utils/knowledge_base';
import { animalSampleDocs, technicalSampleDocs } from '../../utils/sample_docs';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../../utils/model_and_inference';

const customSearchConnectorIndex = 'animals_kb';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  describe('tool: recall', function () {
    before(async () => {
      await deployTinyElserAndSetupKb(getService);
      await addSampleDocsToInternalKb(getService, technicalSampleDocs);
      await addSampleDocsToCustomIndex(getService, animalSampleDocs, customSearchConnectorIndex);
    });

    after(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await clearKnowledgeBase(es);
      // clear custom index
      await es.indices.delete({ index: customSearchConnectorIndex }, { ignore: [404] });
    });

    describe('GET /internal/observability_ai_assistant/functions/recall', () => {
      it('produces unique scores for each doc', async () => {
        const entries = await recall('What happened during the database outage?');
        const uniqueScores = uniq(entries.map(({ esScore }) => esScore));
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

        expect(entries.map(({ id, esScore }) => `${formatScore(esScore!)} - ${id}`)).to.eql([
          'high - animal_whale_migration_patterns',
          'low - animal_elephants_social_structure',
          'low - technical_api_gateway_timeouts',
          'low - technical_cache_misses_thirdparty_api',
          'low - animal_cheetah_life_speed',
          'low - technical_db_outage_slow_queries',
          'low - animal_giraffe_habitat_feeding',
          'low - animal_penguin_antarctic_adaptations',
        ]);
      });

      it('returns the "Cheetah" entry from search connectors as the top result', async () => {
        const entries = await recall('Cheetah');
        const { text, esScore } = first(entries)!;

        // search connector entries have their entire doc stringified in `text` field
        const parsedDoc = JSON.parse(text) as { title: string; text: string };
        expect(parsedDoc.title).to.eql('The Life of a Cheetah');
        expect(esScore).to.greaterThan(0.1);
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

function formatScore(score: number) {
  if (score > 0.5) {
    return 'high';
  }

  if (score > 0.1) {
    return 'medium';
  }

  return 'low';
}
