/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import {
  createMockToolContext,
  createSignificantEventsServer,
  invokeHandler,
  sourceWithSlug,
} from '../../utils/test_helpers';
import {
  createFeatureSimilaritySearchTool,
  SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
} from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

const SOURCES = [
  sourceWithSlug('logs', { id: 'id-logs' }),
  sourceWithSlug('logs.test', { id: 'id-logs-test' }),
];

const SOURCE_REF = {
  slug: 'logs.test',
  title: 'logs.test',
  view_name: '$.nightshift.sources.default.logs.test',
};

const CANDIDATE = {
  candidate_id: 'tech-x',
  title: 'Tech X',
  description: 'some technology',
  type: 'technology' as const,
};

const mockSourcesClient = () => ({
  list: jest.fn().mockResolvedValue({ sources: SOURCES, total: SOURCES.length }),
  assertReadable: jest.fn().mockResolvedValue(undefined),
});

describe('ki_feature_similarity_search tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = createSignificantEventsServer({ featurePrivilege: 'read' });

  beforeEach(() => {
    jest.clearAllMocks();
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
  });

  const createTool = (
    findFeaturesAcrossSources = jest.fn().mockResolvedValue({ hits: [] }),
    toolServer = server,
    sourcesClient = mockSourcesClient()
  ) => {
    const getScopedClients = jest.fn(async () => {
      return {
        licensing: {},
        sourcesClient,
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          findFeaturesAcrossSources,
          getFeatureSourcesBySlug: jest.fn().mockResolvedValue(new Map()),
        }),
      } as unknown as RouteHandlerScopedClients;
    }) as unknown as jest.MockedFunction<GetScopedClients>;

    const tool = createFeatureSimilaritySearchTool({
      getScopedClients,
      server: toolServer,
      logger,
    });
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    return {
      findFeaturesAcrossSources,
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
    expect(tool.schema.safeParse({ slug: 'logs.test', candidates: [CANDIDATE] }).success).toBe(
      true
    );
    expect(
      tool.schema.safeParse({
        slug: 'logs.test',
        candidates: [{ ...CANDIDATE, type: 'computed' }],
      }).success
    ).toBe(false);
  });

  it('does not search when the caller cannot read the analyzed source', async () => {
    const sourcesClient = mockSourcesClient();
    sourcesClient.assertReadable.mockRejectedValue(forbidden('Cannot read source'));
    const { tool, findFeaturesAcrossSources } = createTool(undefined, server, sourcesClient);

    const result = await invokeHandler(
      tool,
      { slug: 'logs.test', candidates: [CANDIDATE] },
      createMockToolContext()
    );

    expect(findFeaturesAcrossSources).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });

  it('scopes the corpus to the sources the caller can read', async () => {
    const sourcesClient = mockSourcesClient();
    sourcesClient.assertReadable.mockImplementation(async (id: string) => {
      if (id === 'id-logs') throw forbidden('Cannot read source');
    });
    const { tool, findFeaturesAcrossSources } = createTool(undefined, server, sourcesClient);

    await invokeHandler(
      tool,
      { slug: 'logs.test', candidates: [CANDIDATE] },
      createMockToolContext()
    );

    expect(findFeaturesAcrossSources).toHaveBeenCalledWith(
      ['id-logs-test'],
      'tech-x Tech X some technology',
      { featureType: 'technology', searchMode: 'semantic' }
    );
  });

  it('searches every candidate across sources and exposes source slugs on hits', async () => {
    const findFeaturesAcrossSources = jest.fn().mockResolvedValue({
      hits: [
        {
          id: 'tech-0',
          uuid: 'u1',
          source_id: 'id-logs',
          type: 'technology',
          title: 'Tech 0',
          description: 'Technology 0',
          properties: { technology: 'tech-0' },
          confidence: 90,
        },
        {
          id: 'tech-0',
          uuid: 'u2',
          source_id: 'id-logs-test',
          type: 'technology',
          title: 'Tech 0',
          description: 'Technology 0',
          properties: { technology: 'tech-0' },
          confidence: 80,
        },
      ],
    });
    const { tool } = createTool(findFeaturesAcrossSources);

    const result = await invokeHandler(
      tool,
      {
        slug: 'logs.test',
        candidates: [CANDIDATE, { ...CANDIDATE, candidate_id: 'tech-y', title: 'Tech Y' }],
      },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(findFeaturesAcrossSources).toHaveBeenCalledTimes(2);
    const hit = {
      id: 'tech-0',
      title: 'Tech 0',
      description: 'Technology 0',
      type: 'technology',
      properties: { technology: 'tech-0' },
      confidence: 90,
      sources: ['logs', 'logs.test'],
    };
    expect(result.results).toEqual([
      { type: 'other', data: { ...SOURCE_REF, candidate_id: 'tech-x', features: [hit] } },
      { type: 'other', data: { ...SOURCE_REF, candidate_id: 'tech-y', features: [hit] } },
    ]);
  });

  it('isolates a per-candidate search failure without failing the call', async () => {
    const { tool } = createTool(jest.fn().mockRejectedValue(new Error('semantic unavailable')));

    const result = await invokeHandler(
      tool,
      { slug: 'logs.test', candidates: [CANDIDATE] },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          ...SOURCE_REF,
          candidate_id: 'tech-x',
          features: [],
          error: 'semantic unavailable',
        },
      },
    ]);
  });

  it('does not search KIs without the Nightshift read privilege', async () => {
    const findFeaturesAcrossSources = jest.fn();
    const { tool } = createTool(
      findFeaturesAcrossSources,
      createSignificantEventsServer({ featurePrivilege: 'none' })
    );

    const result = await invokeHandler(
      tool,
      { slug: 'logs.test', candidates: [CANDIDATE] },
      createMockToolContext()
    );

    expect(findFeaturesAcrossSources).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
