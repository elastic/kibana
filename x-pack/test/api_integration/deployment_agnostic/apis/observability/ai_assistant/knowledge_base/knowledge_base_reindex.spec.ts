/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  addSampleDocsToInternalKb,
  deleteKnowledgeBaseModel,
  getKbIndices,
  getConcreteWriteIndexFromAlias,
  reIndexKnowledgeBase,
  setupKnowledgeBase,
  hasIndexWriteBlock,
  clearKnowledgeBase,
  getAllKbEntries,
} from '../utils/knowledge_base';
import { restoreIndexAssets } from '../utils/index_assets';

const oldIndex = `${resourceNames.writeIndexAlias.kb}-000001`;
const targetIndex = `${resourceNames.writeIndexAlias.kb}-000002`;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const ml = getService('ml');
  const retry = getService('retry');

  describe('POST /internal/observability_ai_assistant/kb/reindex', function () {
    // Skip in environments where migration is not applicable.
    this.tags(['skipServerless']);

    before(async () => {
      await setupKnowledgeBase(getService);
    });

    after(async () => {
      await deleteKnowledgeBaseModel({ ml, es });
    });

    describe('when reindexing is successful', () => {
      before(async () => {
        await addSampleDocs();
        // Invoke the API to trigger re-indexing.
        await reIndexKnowledgeBase(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        // Restore the original state after reindexing.
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      });

      it('updates the write index alias to the new index', async () => {
        const currentWriteIndex = await getConcreteWriteIndexFromAlias(es);
        expect(currentWriteIndex).to.be(targetIndex);
      });

      it('creates the target index and removes the old index', async () => {
        const indices = await getKbIndices(es);
        // The target index should exist and the old one should not.
        expect(indices).to.eql([targetIndex]);
        expect(indices).to.not.contain(oldIndex);
      });

      it('moves all documents to the new target index', async () => {
        const entries = await getAllKbEntries(es);
        // Each document should now be in the new target index.
        const allDocsInTargetIndex = entries.every((doc) => doc._index === targetIndex);
        expect(allDocsInTargetIndex).to.be(true);
      });

      it('ensures the document count remains the same', async () => {
        const entries = await getAllKbEntries(es);
        expect(entries).to.have.length(2);
      });

      it('does not add an index block to the target index', async () => {
        expect(await hasIndexWriteBlock(es, targetIndex)).to.be(false);
      });
    });

    describe('during reindexing', () => {
      let result: Promise<unknown>;
      before(async () => {
        await addSampleDocs();
        result = reIndexKnowledgeBase(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        await result;
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      });

      it('adds an index block to the write index and removes it again', async () => {
        await retry.try(async () => {
          const isBlocked = await hasIndexWriteBlock(es, resourceNames.writeIndexAlias.kb);
          expect(isBlocked).to.be(true);
        });

        await retry.try(async () => {
          const isBlocked = await hasIndexWriteBlock(es, resourceNames.writeIndexAlias.kb);
          expect(isBlocked).to.be(false);
        });
      });
    });

    describe('when target index already exists', () => {
      before(async () => {
        // Pre-create the target index to simulate the error scenario.
        await es.indices.create({ index: targetIndex });
        await addSampleDocs();
        await reIndexKnowledgeBase(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      });

      it('does not update the write index alias', async () => {
        const currentWriteIndex = await getConcreteWriteIndexFromAlias(es);
        expect(currentWriteIndex).to.be(oldIndex);
      });

      it('preserves the target index without deleting it', async () => {
        const indices = await getKbIndices(es);
        // Both the old index and the pre-existing target index remain.
        expect(indices).to.eql([oldIndex, targetIndex]);
        expect(indices).to.contain(targetIndex);
      });

      it('keeps the documents in the original index', async () => {
        const entries = await getAllKbEntries(es);
        const allDocsInOldIndex = entries.every((doc) => doc._index === oldIndex);
        expect(allDocsInOldIndex).to.be(true);
      });

      it('removes the write block after the reindexing attempt', async () => {
        expect(await hasIndexWriteBlock(es, oldIndex)).to.be(false);
        expect(await hasIndexWriteBlock(es, targetIndex)).to.be(false);
      });
    });

    describe('when the knowledge base is empty', () => {
      before(async () => {
        await clearKnowledgeBase(es);
        await reIndexKnowledgeBase(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      });

      it('creates a new target index, deletes the old index and updates the alias', async () => {
        const currentWriteIndex = await getConcreteWriteIndexFromAlias(es);
        expect(currentWriteIndex).to.be(targetIndex);

        const indices = await getKbIndices(es);
        expect(indices).to.eql([targetIndex]);
      });

      it('has no documents in the new target index', async () => {
        const entries = await getAllKbEntries(es);
        expect(entries).to.have.length(0);
      });

      it('removes the write block after reindexing', async () => {
        expect(await hasIndexWriteBlock(es, targetIndex)).to.be(false);
      });
    });
  });

  async function addSampleDocs() {
    const sampleDocs = [
      {
        id: 'favourite_color',
        title: 'Favorite Color',
        text: 'My favourite color is blue.',
      },
      {
        id: 'miscellaneous',
        title: 'Miscellaneous Note',
        text: 'Hello world',
      },
    ];
    await addSampleDocsToInternalKb(getService, sampleDocs);
  }
}
