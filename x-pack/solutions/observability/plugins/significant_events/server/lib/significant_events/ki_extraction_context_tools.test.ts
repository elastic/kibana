/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ToolsStart } from '@kbn/agent-builder-server';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common/tools';
import { createInferenceToolsFromAgentBuilder } from '../agent_builder/inference_tool_bridge';
import { createKiExtractionContextTools } from './ki_extraction_context_tools';

jest.mock('../agent_builder/inference_tool_bridge', () => ({
  createInferenceToolsFromAgentBuilder: jest.fn(),
}));

const createInferenceToolsFromAgentBuilderMock =
  createInferenceToolsFromAgentBuilder as jest.MockedFunction<
    typeof createInferenceToolsFromAgentBuilder
  >;

describe('createKiExtractionContextTools', () => {
  let logger: jest.Mocked<Logger>;
  const request = {} as KibanaRequest;
  const agentBuilderTools = {} as ToolsStart;

  beforeEach(() => {
    logger = loggerMock.create();
    createInferenceToolsFromAgentBuilderMock.mockReset();
  });

  it('returns undefined when the bridge resolves no tools', async () => {
    createInferenceToolsFromAgentBuilderMock.mockResolvedValue({ tools: {}, callbacks: {} });

    await expect(
      createKiExtractionContextTools({ agentBuilderTools, request, logger })
    ).resolves.toBeUndefined();
  });

  it('bridges event_search as significant_event_search with a prompt snippet', async () => {
    createInferenceToolsFromAgentBuilderMock.mockResolvedValue({
      tools: {
        significant_event_search: {
          description: 'search',
          schema: { type: 'object', properties: {} },
        },
      },
      callbacks: { significant_event_search: jest.fn() },
    });

    const result = await createKiExtractionContextTools({
      agentBuilderTools,
      request,
      logger,
    });

    expect(createInferenceToolsFromAgentBuilderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: agentBuilderTools,
        request,
        specs: [
          expect.objectContaining({
            sourceToolId: platformSignificantEventsTools.searchEvent,
            name: 'significant_event_search',
          }),
        ],
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        tools: expect.objectContaining({ significant_event_search: expect.any(Object) }),
        promptSnippet: expect.stringContaining('significant_event_search'),
      })
    );
  });
});
