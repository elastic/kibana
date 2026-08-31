/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { getCriblPackagePolicyPostCreateOrUpdateCallback } from './security_integrations';
import { putCriblRoutingPipeline } from './handlers/put_cribl_routing_pipeline';

jest.mock('./handlers/put_cribl_routing_pipeline', () => ({
  putCriblRoutingPipeline: jest.fn(),
}));

const putCriblRoutingPipelineMock = putCriblRoutingPipeline as jest.MockedFunction<
  typeof putCriblRoutingPipeline
>;

const createLogger = (): Logger =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger);

describe('getCriblPackagePolicyPostCreateOrUpdateCallback', () => {
  const logger = createLogger();
  const asCurrentUser = { id: 'current-user-client' } as unknown as ElasticsearchClient;
  const fallbackEsClient = { id: 'fallback-client' } as unknown as ElasticsearchClient;

  const createContext = (): RequestHandlerContext =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser,
          },
        },
      }),
    } as unknown as RequestHandlerContext);

  const criblPolicyWithRoutes = {
    package: { name: 'cribl' },
    vars: {
      route_entries: {
        value: '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud"}]',
        type: 'textarea',
      },
    },
  } as unknown as NewPackagePolicy;

  beforeEach(() => {
    putCriblRoutingPipelineMock.mockReset();
    putCriblRoutingPipelineMock.mockResolvedValue(undefined);
  });

  it('is a no-op for non-cribl package policies', async () => {
    const policy = {
      package: { name: 'endpoint' },
      vars: {},
    } as NewPackagePolicy;

    await getCriblPackagePolicyPostCreateOrUpdateCallback(policy, logger, createContext());

    expect(putCriblRoutingPipelineMock).not.toHaveBeenCalled();
  });

  it('still writes the pipeline when cribl policy has no route entries', async () => {
    const policy = {
      package: { name: 'cribl' },
      vars: {},
    } as NewPackagePolicy;

    await getCriblPackagePolicyPostCreateOrUpdateCallback(policy, logger, createContext());

    expect(putCriblRoutingPipelineMock).toHaveBeenCalledWith(asCurrentUser, policy, logger);
  });

  it('uses asCurrentUser when context is provided', async () => {
    await getCriblPackagePolicyPostCreateOrUpdateCallback(
      criblPolicyWithRoutes,
      logger,
      createContext(),
      fallbackEsClient
    );

    expect(putCriblRoutingPipelineMock).toHaveBeenCalledWith(
      asCurrentUser,
      criblPolicyWithRoutes,
      logger
    );
  });

  it('falls back to the provided Elasticsearch client when context is missing', async () => {
    await getCriblPackagePolicyPostCreateOrUpdateCallback(
      criblPolicyWithRoutes,
      logger,
      undefined,
      fallbackEsClient
    );

    expect(putCriblRoutingPipelineMock).toHaveBeenCalledWith(
      fallbackEsClient,
      criblPolicyWithRoutes,
      logger
    );
  });

  it('fails closed when context and fallback client are both missing', async () => {
    await expect(
      getCriblPackagePolicyPostCreateOrUpdateCallback(criblPolicyWithRoutes, logger, undefined)
    ).rejects.toMatchObject({
      message: expect.stringContaining('request context is required'),
      apiPassThrough: true,
    });
    expect(putCriblRoutingPipelineMock).not.toHaveBeenCalled();
  });
});
