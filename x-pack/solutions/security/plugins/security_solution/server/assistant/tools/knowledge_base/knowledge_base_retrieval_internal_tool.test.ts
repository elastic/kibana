/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { knowledgeBaseRetrievalInternalTool } from './knowledge_base_retrieval_internal_tool';
import type { KibanaRequest } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type {
  ModelProvider,
  ToolProvider,
  ScopedRunner,
  ToolEventEmitter,
} from '@kbn/onechat-server';
import { loggerMock } from '@kbn/logging-mocks';

describe('knowledgeBaseRetrievalInternalTool', () => {
  it('should return a valid BuiltinToolDefinition', () => {
    const mockGetStartServices = jest.fn();
    const tool = knowledgeBaseRetrievalInternalTool(mockGetStartServices);

    expect(tool.id).toBe('.knowledge-base-retrieval-internal-tool');
    expect(tool.description).toBeDefined();
    expect(tool.schema).toBeDefined();
    expect(tool.handler).toBeDefined();
    expect(tool.tags).toContain('knowledge-base');
    expect(tool.tags).toContain('security');
  });

      it('should handle query input correctly', async () => {
      const mockGetStartServices = jest.fn();
      const tool = knowledgeBaseRetrievalInternalTool(mockGetStartServices);
    const mockContext = {
      request: {} as unknown as KibanaRequest,
      esClient: {} as unknown as IScopedClusterClient,
      modelProvider: {} as unknown as ModelProvider,
      toolProvider: {} as unknown as ToolProvider,
      runner: {} as unknown as ScopedRunner,
      events: {} as unknown as ToolEventEmitter,
      logger: loggerMock.create(),
    };

    const result = await tool.handler({ query: 'test query' }, mockContext);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('other');
    expect(result.results[0].data).toContain('test query');
    expect(result.results[0].data).toContain('integrated with the elastic-assistant plugin kbDataClient');
  });

      it('should validate schema correctly', () => {
      const mockGetStartServices = jest.fn();
      const tool = knowledgeBaseRetrievalInternalTool(mockGetStartServices);
    const schema = tool.schema;

    // Test valid input
    const validInput = { query: 'valid query string' };
    expect(() => schema.parse(validInput)).not.toThrow();

    // Test invalid input
    const invalidInput = { query: 123 };
    expect(() => schema.parse(invalidInput)).toThrow();

    // Test missing query
    const missingQuery = {};
    expect(() => schema.parse(missingQuery)).toThrow();
  });
});
