/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../../routes/types';
import {
  createMockToolContext,
  createSignificantEventsServer,
  invokeHandler,
  mockSourcesClient,
} from '../../../utils/test_helpers';
import { createGetFeaturesTool } from './tool';

describe('ki_features_get tool', () => {
  const logger = loggingSystemMock.createLogger();
  const getFeatures = jest.fn();
  const getScopedClients = jest.fn(async () => {
    return {
      sourcesClient: mockSourcesClient(['logs.test']),
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures }),
    } as unknown as RouteHandlerScopedClients;
  }) as unknown as jest.MockedFunction<GetScopedClients>;

  beforeEach(() => {
    jest.clearAllMocks();
    getFeatures.mockResolvedValue({
      hits: [
        {
          id: 'feature-1',
          run_id: 'run-1',
          source_id: 'logs.test',
          type: 'entity',
          title: 'Checkout',
          description: 'Checkout service',
          confidence: 95,
          properties: { service: 'checkout' },
        },
      ],
    });
  });

  const createTool = () =>
    createGetFeaturesTool({
      getScopedClients,
      server: createSignificantEventsServer({ featurePrivilege: 'read' }),
      logger,
    });

  it('bounds its input', () => {
    const tool = createTool();
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(tool.schema.safeParse({ slug: 'logs.test', limit: 100 }).success).toBe(true);
    expect(tool.schema.safeParse({ slug: 'logs.test', limit: 101 }).success).toBe(false);
  });

  it('loads features for an authorized target', async () => {
    const result = await invokeHandler(
      createTool(),
      {
        slug: 'logs.test',
        feature_types: ['entity'],
        min_confidence: 70,
        limit: 25,
      },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getFeatures).toHaveBeenCalledWith('logs.test', {
      type: ['entity'],
      minConfidence: 70,
      limit: 25,
      excludedType: ['log_samples'],
    });
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          count: 1,
          slug: 'logs.test',
          title: 'logs.test',
          view_name: '$.nightshift.sources.default.logs.test',
          features: [
            expect.objectContaining({
              id: 'feature-1',
              type: 'entity',
              title: 'Checkout',
            }),
          ],
        },
      },
    ]);
  });

  it('does not load features without the Nightshift read privilege', async () => {
    const tool = createGetFeaturesTool({
      getScopedClients,
      server: createSignificantEventsServer({ featurePrivilege: 'none' }),
      logger,
    });

    const result = await invokeHandler(tool, { slug: 'logs.test' }, createMockToolContext());

    expect(getFeatures).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });

  it('does not load stored features when the caller cannot read the source data', async () => {
    const sourcesClient = mockSourcesClient(['logs.test']);
    sourcesClient.assertReadable.mockRejectedValue(forbidden('Cannot read source logs.test'));
    getScopedClients.mockResolvedValueOnce({
      sourcesClient,
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ getFeatures }),
    } as unknown as RouteHandlerScopedClients);

    const result = await invokeHandler(
      createTool(),
      { slug: 'logs.test' },
      createMockToolContext()
    );

    expect(sourcesClient.assertReadable).toHaveBeenCalledWith('logs.test');
    expect(getFeatures).not.toHaveBeenCalled();
    expect(result).toMatchObject({ results: [{ type: 'error' }] });
  });
});
