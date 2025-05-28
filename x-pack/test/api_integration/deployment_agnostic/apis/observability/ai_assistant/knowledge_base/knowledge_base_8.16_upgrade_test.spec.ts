/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import expect from '@kbn/expect';
import {
  KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
} from '@kbn/observability-ai-assistant-plugin/common';
import { sortBy } from 'lodash';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import { ElasticsearchClient } from '@kbn/core/server';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  getKnowledgeBaseEntriesFromEs,
  getKnowledgeBaseEntriesFromApi,
  refreshKbIndex,
} from '../utils/knowledge_base';
import {
  createOrUpdateIndexAssets,
  deleteIndexAssets,
  restoreIndexAssets,
  runStartupMigrations,
} from '../utils/index_assets';
import { restoreKbSnapshot } from '../utils/snapshots';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');

  // In 8.16 and earlier embeddings were stored in the `ml.tokens` field
  // In 8.17 `ml.tokens` is replaced with `semantic_text` field and the custom ELSER inference endpoint "obs_ai_assistant_kb_inference" is introduced
  // When upgrading we must ensure that the semantic_text field is populated
  describe('Knowledge base: when upgrading from 8.16 to 8.17', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless', 'skipCloud']);

    describe('using a snapshot', () => {
      before(async () => {
        await teardownTinyElserModelAndInferenceEndpoint(getService);
        await deleteIndexAssets(getService);
        await restoreKbSnapshot({
          log,
          es,
          snapshotFolderName: 'snapshot_kb_8.16',
          snapshotName: 'kb_snapshot_8.16',
        });

        await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
        await deployTinyElserAndSetupKb(getService);
      });

      after(async () => {
        await teardownTinyElserModelAndInferenceEndpoint(getService);
        await restoreIndexAssets(getService);
      });

      describe('before migrating', () => {
        it('the docs do not have semantic_text embeddings', async () => {
          const hits = await getKnowledgeBaseEntriesFromEs(es);
          const hasSemanticTextEmbeddings = hits.some((hit) => hit._source?.semantic_text);

          expect(hits.length).to.be(60);
          expect(hasSemanticTextEmbeddings).to.be(false);
        });
      });

      describe('after migrating', () => {
        before(async () => {
          await runStartupMigrations(observabilityAIAssistantAPIClient);
        });

        it('the docs have semantic_text field', async () => {
          await retry.try(async () => {
            const hits = await getKnowledgeBaseEntriesFromEs(es);
            const hasSemanticTextField = hits.every((hit) => hit._source?.semantic_text);

            expect(hits.length).to.be(60);
            expect(hasSemanticTextField).to.be(true);
          });
        });

        it('the docs have embeddings', async () => {
          await retry.try(async () => {
            const hits = await getKnowledgeBaseEntriesFromEs(es);

            const everyEntryHasEmbeddings = hits.every(
              (hit) =>
                // @ts-expect-error
                Object.keys(hit._source?.semantic_text.inference.chunks[0].embeddings).length > 0
            );
            expect(hits.length).to.be(60);
            expect(everyEntryHasEmbeddings).to.be(true);
          });
        });

        it('returns entries correctly via API', async () => {
          const res = await getKnowledgeBaseEntriesFromApi({ observabilityAIAssistantAPIClient });
          expect(res.status).to.be(200);

          expect(
            sortBy(
              res.body.entries
                .filter(omitLensEntry)
                .map(({ title, text, type }) => ({ title, text, type })),
              ({ title }) => title
            )
          ).to.eql([
            { title: 'movie_quote', type: 'contextual', text: 'To infinity and beyond!' },
            {
              title: 'user_color',
              type: 'contextual',
              text: "The user's favourite color is blue.",
            },
          ]);
        });
      });
    });

    describe('manually created entries', () => {
      before(async () => {
        await restoreIndexAssets(getService);
        await deployTinyElserAndSetupKb(getService);

        // index sample documents
        await Promise.all([
          addEntryWithoutSemanticText({ es, title: 'user_color', text: 'Red' }),
          addEntryWithoutSemanticText({ es, title: 'user_nickname', text: 'Peter Parker' }),
          addEntryWithoutSemanticText({ es, title: 'empty_text_doc', text: '' }), // important to test for empty text: https://github.com/elastic/kibana/issues/220339
        ]);
        await refreshKbIndex(es);
        await runStartupMigrations(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        await teardownTinyElserModelAndInferenceEndpoint(getService);
      });

      it('should migrate entries with `text` and ignore entries without `text`', async () => {
        await retry.try(async () => {
          const hits = await getKnowledgeBaseEntriesFromEs(es);
          expect(hits.filter((hit) => hit._source?.semantic_text)).to.have.length(2);
          expect(hits.length).to.be(3);
        });
      });
    });
  });
}

function omitLensEntry(entry?: KnowledgeBaseEntry) {
  return entry?.labels?.category !== 'lens';
}

async function addEntryWithoutSemanticText({
  es,
  title,
  text,
}: {
  es: ElasticsearchClient;
  title: string;
  text: string;
}) {
  await es.index<KnowledgeBaseEntry>({
    index: resourceNames.writeIndexAlias.kb,
    document: {
      id: uuidV4(),
      title,
      text,
      confidence: 'high',
      is_correction: false,
      type: 'contextual',
      public: false,
      role: KnowledgeBaseEntryRole.UserEntry,
      '@timestamp': new Date().toISOString(),
    },
  });
}
