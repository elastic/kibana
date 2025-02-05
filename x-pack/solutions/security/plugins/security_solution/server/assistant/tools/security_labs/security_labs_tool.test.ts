/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from './security_labs_tool';
import type {
  ContentReferencesStore,
  KnowledgeBaseEntryContentReference,
} from '@kbn/elastic-assistant-common';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';

describe('SecurityLabsTool', () => {
  const contentReferencesStore = newContentReferencesStoreMock();
  const getKnowledgeBaseDocumentEntries = jest.fn().mockResolvedValue([]);
  const kbDataClient = { getKnowledgeBaseDocumentEntries };
  const defaultArgs = {
    isEnabledKnowledgeBase: true,
    contentReferencesStore,
    kbDataClient,
  } as unknown as AssistantToolParams;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DynamicStructuredTool', () => {
    it('includes citations', async () => {
      const tool = SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool(defaultArgs) as DynamicStructuredTool;

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'exampleContentReferenceId' });
          expect(reference.type).toEqual('KnowledgeBaseEntry');
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryId).toEqual(
            'securityLabsId'
          );
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryName).toEqual(
            'Elastic Security Labs content'
          );
          return reference;
        }
      );

      const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

      expect(result).toContain('Citation: {reference(exampleContentReferenceId)}');
    });

    it('does not include citations when contentReferencesStore is false', async () => {
      const tool = SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool({
        ...defaultArgs,
        contentReferencesStore: undefined,
      }) as DynamicStructuredTool;

      const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

      expect(result).not.toContain('Citation:');
    });
  });
});
