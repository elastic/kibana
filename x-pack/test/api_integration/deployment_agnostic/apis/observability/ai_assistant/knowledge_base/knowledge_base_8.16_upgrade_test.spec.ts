/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  getKnowledgeBaseEntriesFromEs,
  getKnowledgeBaseEntriesFromApi,
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
  describe('when upgrading from 8.16 to 8.17', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await teardownTinyElserModelAndInferenceEndpoint(getService);
      await deleteIndexAssets(es);
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
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    describe('before migrating', () => {
      it('the docs do not have semantic_text embeddings', async () => {
        const hits = await getKnowledgeBaseEntriesFromEs(es);
        const hasSemanticTextEmbeddings = hits.some((hit) => hit._source?.semantic_text);

        expect(hits.length).to.be(10);
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
          expect(hasSemanticTextField).to.be(true);
        });
      });

      it('the docs have embeddings', async () => {
        await retry.try(async () => {
          const hits = await getKnowledgeBaseEntriesFromEs(es);
          const hasEmbeddings = hits.every(
            (hit) =>
              // @ts-expect-error
              Object.keys(hit._source?.semantic_text.inference.chunks[0].embeddings).length > 0
          );
          expect(hasEmbeddings).to.be(true);
        });
      });

      it('the docs have correct text content', async () => {
        await retry.try(async () => {
          const hits = await getKnowledgeBaseEntriesFromEs(es);
          expect(
            hits
              .filter((hit) => omitLensEntry(hit._source))
              // @ts-expect-error
              .map((hit) => hit._source?.semantic_text.text)
              .sort()
          ).to.eql(['To infinity and beyond!', "The user's favourite color is blue."].sort());
        });
      });

      it('returns entries correctly via API', async () => {
        const res = await getKnowledgeBaseEntriesFromApi(observabilityAIAssistantAPIClient);
        expect(res.status).to.be(200);

        expect(
          res.body.entries
            .filter(omitLensEntry)
            .map(({ title, text, type }) => ({ title, text, type }))
        ).to.eql([
          {
            title: 'movie_quote',
            type: 'contextual',
            text: 'To infinity and beyond!',
          },
          {
            title: 'user_color',
            type: 'contextual',
            text: "The user's favourite color is blue.",
          },
        ]);
      });
    });
  });
}

function omitLensEntry(entry?: KnowledgeBaseEntry) {
  return entry?.labels?.category !== 'lens';
}
