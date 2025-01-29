/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetrievalQAChain } from 'langchain/chains';
import type { DynamicTool } from '@langchain/core/tools';
import { NL_TO_ESQL_TOOL } from './nl_to_esql_tool';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/actions_connector/post_actions_connector_execute_route.gen';
import { loggerMock } from '@kbn/logging-mocks';
import { getPromptSuffixForOssModel } from './common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';

describe('NaturalLanguageESQLTool', () => {
  const chain = {} as RetrievalQAChain;
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;
  const request = {
    body: {
      isEnabledKnowledgeBase: false,
      alertsIndexPattern: '.alerts-security.alerts-default',
      allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
      allowReplacement: ['user.name'],
      replacements: { key: 'value' },
      size: 20,
    },
  } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const logger = loggerMock.create();
  const inference = {} as InferenceServerStart;
  const connectorId = 'fake-connector';
  const contentReferencesStore = {} as ContentReferencesStore;
  const rest = {
    chain,
    esClient,
    logger,
    request,
    inference,
    connectorId,
    isEnabledKnowledgeBase: true,
    contentReferencesStore,
  };

  describe('isSupported', () => {
    it('returns true if connectorId and inference have values', () => {
      expect(NL_TO_ESQL_TOOL.isSupported(rest)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('returns null if inference plugin is not provided', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        ...rest,
        inference: undefined,
      });

      expect(tool).toBeNull();
    });

    it('returns null if connectorId is not provided', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        ...rest,
        connectorId: undefined,
      });

      expect(tool).toBeNull();
    });

    it('should return a Tool instance when given required properties', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        ...rest,
      });

      expect(tool?.name).toEqual('NaturalLanguageESQLTool');
    });

    it('should return a tool with the expected tags', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['esql', 'query-generation', 'knowledge-base']);
    });

    it('should return tool with the expected description for OSS model', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isOssModel: true,
        ...rest,
      }) as DynamicTool;

      expect(tool.description).toContain(getPromptSuffixForOssModel('NaturalLanguageESQLTool'));
    });

    it('should return tool with the expected description for non-OSS model', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isOssModel: false,
        ...rest,
      }) as DynamicTool;

      expect(tool.description).not.toContain(getPromptSuffixForOssModel('NaturalLanguageESQLTool'));
    });
  });
});
