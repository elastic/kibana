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
  getConcreteWriteIndex,
  reindexKnowledgeBase,
  setupKnowledgeBase,
} from '../utils/knowledge_base';
import { restoreIndexAssets } from '../utils/index_assets';

const oldIndex = `${resourceNames.writeIndexAlias.kb}-000001`;
const targetIndex = `${resourceNames.writeIndexAlias.kb}-000002`;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');
  const ml = getService('ml');

  describe('knowledge base reindex', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      await setupKnowledgeBase(getService);
    });

    after(async () => {
      await deleteKnowledgeBaseModel({ ml, es });
      await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
    });

    describe('when reindexing is successful', () => {
      before(async () => {
        await addSampleDocs();
        await reindexKnowledgeBase(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      });

      it('updates the write index to the new index', async () => {
        expect(await getConcreteWriteIndex(es)).to.eql(targetIndex);
      });

      it('creates a new target index and deletes the old one', async () => {
        const indices = await getKbIndices(es);
        expect(indices).to.contain(targetIndex);
        expect(indices).to.not.contain(oldIndex);
      });

      it('moves the documents to the target index', async () => {
        const entries = await getAllKbEntries();
        const allDocsInTargetIndex = entries.every((doc) => doc._index === targetIndex);
        expect(allDocsInTargetIndex).to.be(true);
      });

      it('ensures document count remains the same', async () => {
        const newDocs = (await getAllKbEntries()).length;
        expect(newDocs).to.eql(2);
      });
    });

    describe('when target index already exists', () => {
      before(async () => {
        await es.indices.create({ index: targetIndex });
        await addSampleDocs();
        await reindexKnowledgeBase(observabilityAIAssistantAPIClient);
      });

      after(async () => {
        await restoreIndexAssets(observabilityAIAssistantAPIClient, es);
      });

      it('does not update the write index', async () => {
        expect(await getConcreteWriteIndex(es)).to.eql(oldIndex);
      });

      it('does not delete the target index', async () => {
        const indices = await getKbIndices(es);
        expect(indices).to.contain(targetIndex);
      });

      it('does not move the documents', async () => {
        const entries = await getAllKbEntries();
        const allDocsInOldIndex = entries.every((doc) => doc._index === oldIndex);
        expect(allDocsInOldIndex).to.be(true);
      });
    });
  });

  async function getAllKbEntries() {
    const response = await es.search({
      index: `${resourceNames.indexPatterns.kb}`,
      query: { match_all: {} },
    });

    return response.hits.hits;
  }

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
