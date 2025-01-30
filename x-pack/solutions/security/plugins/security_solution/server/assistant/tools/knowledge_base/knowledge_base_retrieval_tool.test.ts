/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { KNOWLEDGE_BASE_RETRIEVAL_TOOL } from './knowledge_base_retrieval_tool';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type {
  ContentReferencesStore,
  KnowledgeBaseEntryContentReference,
} from '@kbn/elastic-assistant-common';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import { loggerMock } from '@kbn/logging-mocks';
import { Document } from 'langchain/document';

describe('KnowledgeBaseRetievalTool', () => {
  const logger = loggerMock.create();
  const contentReferencesStore = newContentReferencesStoreMock();
  const getKnowledgeBaseDocumentEntries = jest.fn();
  const kbDataClient = { getKnowledgeBaseDocumentEntries };
  const defaultArgs = {
    isEnabledKnowledgeBase: true,
    contentReferencesStore,
    kbDataClient,
    logger,
  } as unknown as AssistantToolParams;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DynamicStructuredTool', () => {
    it('includes citations', async () => {
      const tool = KNOWLEDGE_BASE_RETRIEVAL_TOOL.getTool(defaultArgs) as DynamicStructuredTool;

      getKnowledgeBaseDocumentEntries.mockResolvedValue([
        new Document({
          id: 'exampleId',
          pageContent: 'text',
          metadata: {
            name: 'exampleName',
          },
        }),
      ] as Document[]);

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'exampleContentReferenceId' });
          expect(reference.type).toEqual('KnowledgeBaseEntry');
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryId).toEqual(
            'exampleId'
          );
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryName).toEqual(
            'exampleName'
          );
          return reference;
        }
      );

      const result = await tool.func({ query: 'What is my favourite food' });

      expect(result).toContain('citation":"{reference(exampleContentReferenceId)}"');
    });

    it('does not include citations if contentReferenceStore is false', async () => {
      const tool = KNOWLEDGE_BASE_RETRIEVAL_TOOL.getTool({
        ...defaultArgs,
        contentReferencesStore: undefined,
      }) as DynamicStructuredTool;

      getKnowledgeBaseDocumentEntries.mockResolvedValue([
        new Document({
          id: 'exampleId',
          pageContent: 'text',
          metadata: {
            name: 'exampleName',
          },
        }),
      ] as Document[]);

      const result = await tool.func({ query: 'What is my favourite food' });

      expect(result).not.toContain('citation');
    });
  });
});
