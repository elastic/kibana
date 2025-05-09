/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { KIBANA_CLIENT_TOOL } from './kibana_client_tool';
import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { getMemoizedKibanaClientTool } from './kibana_client_open_api';

const assistantToolParams = {
  createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
  connectorId: 'fake-connector',
  request: {
    rewrittenUrl: {
      origin: 'http://localhost:5601',
      pathname: 'basepath/internal/elastic_assistant/actions/connector/1234/_execute',
    },
    headers: {
      origin: 'http://localhost:5601',
      'kbn-version': '8.0.0',
    },
  },
  assistantContext: {
    getServerBasePath: jest.fn().mockReturnValue('basepath'),
    getRegisteredFeatures: jest.fn().mockReturnValue({
      kibanaClientToolEnabled: true,
    }),
    buildFlavor: 'traditional',
  },
} as unknown as AssistantToolParams;

describe('Kibana client tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DynamicStructuredTool', () => {
    it('isSupported', async () => {
      expect(KIBANA_CLIENT_TOOL.isSupported(assistantToolParams)).toBe(true);
    });

    it('isSupported feature flag off', async () => {
      (
        assistantToolParams.assistantContext?.getRegisteredFeatures as jest.Mock
      ).mockReturnValueOnce({
        kibanaClientToolEnabled: false,
      });
      expect(KIBANA_CLIENT_TOOL.isSupported(assistantToolParams)).toBe(false);
    });

    it('isSupported missing createLlmInstance', async () => {
      expect(
        KIBANA_CLIENT_TOOL.isSupported({ ...assistantToolParams, createLlmInstance: undefined })
      ).toBe(false);
    });

    it('isSupported missing assistantContext', async () => {
      expect(
        KIBANA_CLIENT_TOOL.isSupported({ ...assistantToolParams, assistantContext: undefined })
      ).toBe(false);
    });

    it('gets tool returns tool', async () => {
      const tool = (await KIBANA_CLIENT_TOOL.getTool(assistantToolParams)) as DynamicStructuredTool;

      expect(tool).not.toBeNull();
    });

    it('tool is cached', async () => {
      getMemoizedKibanaClientTool.cache.clear?.();

      const loadTool1Start = Date.now();
      await KIBANA_CLIENT_TOOL.getTool(assistantToolParams);
      const loadTool1Duration = Date.now() - loadTool1Start;

      const loadTool2Start = Date.now();
      await KIBANA_CLIENT_TOOL.getTool(assistantToolParams);
      const loadTool2Duration = Date.now() - loadTool2Start;

      // The second load should be significantly faster than the first load
      expect(loadTool1Duration).toBeGreaterThan(loadTool2Duration * 5);
      expect(loadTool2Duration).toBeLessThan(500);
    });
  });
});
