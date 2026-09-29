/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import {
  createFeatureSimilaritySearchTool,
  SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
} from './tool';

vi.mock('../../../routes/utils/assert_significant_events_access', () => {
  const mocked = {
    assertSignificantEventsAccess: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('ki_feature_similarity_search tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as SignificantEventsServer;

  beforeEach(() => {
    vi.clearAllMocks();
    (assertSignificantEventsAccess as Mock).mockResolvedValue(undefined);
  });

  const createTool = (findFeatures = vi.fn().mockResolvedValue({ hits: [] })) => {
    const getScopedClients = vi.fn(async () => {
      return {
        licensing: {},
        streamsClient: { getStream: vi.fn().mockResolvedValue({ name: 'logs.test' }) },
        getKnowledgeIndicatorClient: vi.fn().mockResolvedValue({ findFeatures }),
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as MockedFunction<GetScopedClients>;

    const tool = createFeatureSimilaritySearchTool({
      getScopedClients,
      server,
      logger,
    });
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    return {
      findFeatures,
      tool,
    };
  };

  it('uses a read-only schema and the expected id', () => {
    const { tool } = createTool();

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID);
    expect(tool.annotations).toEqual(
      expect.objectContaining({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      })
    );
    expect(
      tool.schema.safeParse({
        stream_name: 'logs.test',
        candidates: [
          {
            candidate_id: 'okta-sdk',
            title: 'Okta SDK',
            description: 'Okta client',
            type: 'technology',
          },
        ],
      }).success
    ).toBe(true);
    expect(
      tool.schema.safeParse({
        stream_name: 'logs.test',
        candidates: [
          {
            candidate_id: 'okta-sdk',
            title: 'Okta SDK',
            description: 'Okta client',
            type: 'computed',
          },
        ],
      }).success
    ).toBe(false);
  });

  it('searches every candidate and groups hits by candidate_id', async () => {
    const findFeatures = vi.fn().mockResolvedValue({
      hits: [
        {
          id: 'tech-0',
          type: 'technology',
          title: 'Tech 0',
          description: 'Technology 0',
          confidence: 90,
        },
      ],
    });
    const { tool } = createTool(findFeatures);

    const result = await invokeHandler(
      tool,
      {
        stream_name: 'logs.test',
        candidates: [
          {
            candidate_id: 'tech-x',
            title: 'Tech X',
            description: 'some technology',
            type: 'technology',
          },
          {
            candidate_id: 'tech-y',
            title: 'Tech Y',
            description: 'other technology',
            type: 'technology',
          },
        ],
      },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(findFeatures).toHaveBeenCalledTimes(2);
    expect(findFeatures).toHaveBeenCalledWith('logs.test', 'tech-x Tech X some technology', {
      searchMode: 'semantic',
      limit: 20,
    });
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          candidate_id: 'tech-x',
          features: [
            { id: 'tech-0', title: 'Tech 0', description: 'Technology 0', confidence: 90 },
          ],
        },
      },
      {
        type: 'other',
        data: {
          candidate_id: 'tech-y',
          features: [
            { id: 'tech-0', title: 'Tech 0', description: 'Technology 0', confidence: 90 },
          ],
        },
      },
    ]);
  });

  it('isolates a per-candidate search failure without failing the call', async () => {
    const { tool } = createTool(vi.fn().mockRejectedValue(new Error('semantic unavailable')));

    const result = await invokeHandler(
      tool,
      {
        stream_name: 'logs.test',
        candidates: [
          {
            candidate_id: 'okta',
            title: 'Okta',
            description: 'Identity provider',
            type: 'technology',
          },
        ],
      },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([
      {
        type: 'other',
        data: { candidate_id: 'okta', features: [], error: 'semantic unavailable' },
      },
    ]);
  });
});
