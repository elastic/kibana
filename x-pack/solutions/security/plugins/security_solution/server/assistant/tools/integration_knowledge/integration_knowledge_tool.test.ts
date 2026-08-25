/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { INTEGRATION_KNOWLEDGE_TOOL } from './integration_knowledge_tool';
import type {
  ContentReferencesStore,
  HrefContentReference,
  KnowledgeBaseEntryContentReference,
} from '@kbn/elastic-assistant-common';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';

const mockSearch = jest.fn();
const mockAssistantContext = {
  core: {
    elasticsearch: {
      client: {
        asInternalUser: {
          search: mockSearch,
        },
      },
    },
  },
  getServerBasePath: () => '/test-base-path',
};

describe('IntegrationKnowledgeTool', () => {
  const contentReferencesStore = newContentReferencesStoreMock();
  const defaultArgs = {
    assistantContext: mockAssistantContext,
    contentReferencesStore,
  } as unknown as AssistantToolParams;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to index existing - mock search call with size: 0 for index existence check
    mockSearch.mockResolvedValue({ hits: { total: { value: 0 } } });
  });

  describe('isSupported', () => {
    it('returns true when assistantContext is provided', () => {
      expect(INTEGRATION_KNOWLEDGE_TOOL.isSupported(defaultArgs)).toBe(true);
    });

    it('returns false when assistantContext is not provided', () => {
      const argsWithoutContext = { contentReferencesStore } as AssistantToolParams;
      expect(INTEGRATION_KNOWLEDGE_TOOL.isSupported(argsWithoutContext)).toBe(false);
    });
  });

  describe('getTool', () => {
    it('returns null when not supported', async () => {
      const argsWithoutContext = { contentReferencesStore } as AssistantToolParams;
      const result = await INTEGRATION_KNOWLEDGE_TOOL.getTool(argsWithoutContext);
      expect(result).toBeNull();
    });

    it('returns a DynamicStructuredTool when supported and index exists', async () => {
      const tool = await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('IntegrationKnowledgeTool');
      expect(mockSearch).toHaveBeenCalledWith({
        index: '.integration_knowledge',
        size: 0,
      });
    });

    it('returns null when index does not exist', async () => {
      mockSearch.mockRejectedValue(new Error('index_not_found_exception'));
      const tool = await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs);
      expect(tool).toBeNull();
    });

    it('returns null when index existence check throws error', async () => {
      mockSearch.mockRejectedValue(new Error('Index check failed'));
      const tool = await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs);
      expect(tool).toBeNull();
    });
  });

  describe('DynamicStructuredTool', () => {
    it('includes href citations for integration packages', async () => {
      // First call is for index existence check
      mockSearch.mockResolvedValueOnce({ hits: { total: { value: 0 } } }).mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _source: {
                package_name: 'nginx',
                filename: 'README.md',
                content: 'This is how to configure nginx integration for web server monitoring.',
                version: '1.2.3',
              },
            },
          ],
        },
      });

      const tool = (await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs)) as DynamicStructuredTool;

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'exampleContentReferenceId' });
          expect(reference.type).toEqual('Href');
          expect((reference as HrefContentReference).href).toEqual(
            '/test-base-path/app/integrations/detail/nginx'
          );
          expect((reference as HrefContentReference).label).toEqual(
            'nginx integration (README.md)'
          );
          return reference;
        }
      );

      const result = await tool.func({ question: 'How do I configure nginx?' });

      expect(mockSearch).toHaveBeenCalledWith({
        index: '.integration_knowledge',
        size: 10,
        query: {
          semantic: {
            field: 'content',
            query: 'How do I configure nginx?',
          },
        },
        _source: ['package_name', 'filename', 'content', 'version'],
      });

      expect(result).toContain('Citation: {reference(exampleContentReferenceId)}');
      expect(result).toContain('Package: nginx (v1.2.3)');
      expect(result).toContain('File: README.md');
      expect(result).toContain('This is how to configure nginx integration');
    });

    it('includes knowledge base citations as fallback', async () => {
      // First call is for index existence check
      mockSearch.mockResolvedValueOnce({ hits: { total: { value: 0 } } }).mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _source: {
                package_name: 'apache',
                filename: 'config.yml',
                content: 'Apache integration configuration details.',
              },
            },
          ],
        },
      });

      const tool = (await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs)) as DynamicStructuredTool;

      // Mock the href reference creation to throw an error to trigger fallback
      (contentReferencesStore.add as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Reference creation failed');
        })
        .mockImplementationOnce((creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'fallbackReferenceId' });
          expect(reference.type).toEqual('KnowledgeBaseEntry');
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryId).toEqual(
            'integrationKnowledge'
          );
          expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryName).toEqual(
            'Integration knowledge for apache'
          );
          return reference;
        });

      const result = await tool.func({ question: 'How do I setup apache?' });

      expect(result).toContain('Citation: {reference(fallbackReferenceId)}');
      expect(result).toContain('Package: apache');
      expect(result).toContain('File: config.yml');
    });

    it('handles package without version', async () => {
      // First call is for index existence check
      mockSearch.mockResolvedValueOnce({ hits: { total: { value: 0 } } }).mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _source: {
                package_name: 'mysql',
                filename: 'setup.md',
                content: 'MySQL integration setup instructions.',
              },
            },
          ],
        },
      });

      const tool = (await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs)) as DynamicStructuredTool;

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          const reference = creator({ id: 'mysqlReferenceId' });
          return reference;
        }
      );

      const result = await tool.func({ question: 'MySQL setup' });

      expect(result).toContain('Package: mysql');
      expect(result).not.toContain('(v');
    });

    it('returns appropriate message when no results found', async () => {
      // First call is for index existence check
      mockSearch.mockResolvedValueOnce({ hits: { total: { value: 0 } } }).mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      });

      const tool = (await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs)) as DynamicStructuredTool;

      const result = await tool.func({ question: 'nonexistent integration' });

      expect(result).toBe('[]');
    });

    it('handles search errors gracefully', async () => {
      // First call is for index existence check, second call throws error
      mockSearch
        .mockResolvedValueOnce({ hits: { total: { value: 0 } } })
        .mockRejectedValueOnce(new Error('Elasticsearch connection failed'));

      const tool = (await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs)) as DynamicStructuredTool;

      const result = await tool.func({ question: 'test question' });

      expect(result).toBe(
        'Error querying integration knowledge: Elasticsearch connection failed. The integration knowledge base may not be available.'
      );
    });

    it('truncates long results to 20000 characters', async () => {
      const longContent = 'A'.repeat(25000);
      // First call is for index existence check
      mockSearch.mockResolvedValueOnce({ hits: { total: { value: 0 } } }).mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'test-id',
              _source: {
                package_name: 'large-integration',
                filename: 'large-doc.md',
                content: longContent,
              },
            },
          ],
        },
      });

      const tool = (await INTEGRATION_KNOWLEDGE_TOOL.getTool(defaultArgs)) as DynamicStructuredTool;

      (contentReferencesStore.add as jest.Mock).mockImplementation(
        (creator: Parameters<ContentReferencesStore['add']>[0]) => {
          return creator({ id: 'largeContentId' });
        }
      );

      const result = await tool.func({ question: 'large integration' });

      expect(result.length).toBe(20000);
    });
  });
});
