/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import {
  type getEndpointPackageStatusInputSchema,
  getEndpointPackageStatusOutputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/package';
import { createGetEndpointPackageStatusStepDefinition } from '.';

const getEndpointPackageStatusStepDefinition = createGetEndpointPackageStatusStepDefinition(false);

type Context = StepHandlerContext<typeof getEndpointPackageStatusInputSchema>;

const PACKAGE_ROUTE = '/api/fleet/epm/packages/endpoint';
const TRANSFORMS_ROUTE = '/internal/api/endpoint/metadata/transforms';

const securityException = {
  meta: { statusCode: 403 },
  body: { error: { type: 'security_exception' } },
};

const createContext = (input: Context['input']): Context => {
  const esClient = {
    transform: { getTransform: jest.fn().mockRejectedValue(securityException) },
    indices: { getSettings: jest.fn().mockRejectedValue(securityException) },
    ingest: { getPipeline: jest.fn().mockRejectedValue(securityException) },
    cat: { nodes: jest.fn().mockRejectedValue(securityException) },
  };
  return {
    input,
    contextManager: {
      callKibanaApi: jest.fn(async ({ path }: { path: string }) => {
        if (path === PACKAGE_ROUTE) {
          return {
            status: 200,
            headers: {},
            body: {
              item: {
                name: 'endpoint',
                version: '9.4.0',
                latestVersion: '9.5.0',
                installationInfo: { version: '9.4.0', install_status: 'installed' },
                assets: {
                  elasticsearch: {
                    transform: [
                      {
                        pkgkey: 'endpoint-9.4.0',
                        path: 'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
                      },
                    ],
                  },
                },
              },
            },
          };
        }
        throw new KibanaApiCallError({ status: 403, headers: {}, body: {}, message: 'HTTP 403' });
      }),
      getScopedEsClient: jest.fn(() => esClient),
      getFakeRequest: jest.fn(),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    },
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    abortSignal: new AbortController().signal,
    stepId: 'test-step',
    stepType: 'security.getEndpointPackageStatus',
  } as unknown as Context;
};

const createReadableContext = (): Context => {
  const context = createContext({ include_configurations: true });
  jest.mocked(context.contextManager.callKibanaApi).mockResolvedValue({
    status: 200,
    headers: {},
    body: { item: { name: 'endpoint', version: '9.4.0' } },
  });
  const client = context.contextManager.getScopedEsClient();
  jest.spyOn(client.transform, 'getTransform').mockResolvedValue({ count: 0, transforms: [] });
  jest.spyOn(client.indices, 'getSettings').mockResolvedValue({
    '.metrics-endpoint.metadata_united_default': {
      settings: { index: { number_of_shards: '1' } },
    },
  });
  jest.spyOn(client.ingest, 'getPipeline').mockResolvedValue({});
  jest.spyOn(client.cat, 'nodes').mockResolvedValue([]);
  return context;
};

describe('getEndpointPackageStatusStepDefinition', () => {
  it.each([false, true])('reads metadata settings with serverless=%s', async (isServerless) => {
    const context = createReadableContext();
    const client = context.contextManager.getScopedEsClient();
    const result = await createGetEndpointPackageStatusStepDefinition(isServerless).handler(
      context
    );
    const output = getEndpointPackageStatusOutputSchema.parse(result.output);

    expect(output.configurations?.indices).toEqual([
      {
        index: '.metrics-endpoint.metadata_united_default',
        settings: { index: { number_of_shards: '1' } },
      },
    ]);
    expect(client.indices.getSettings).toHaveBeenCalledWith(
      {
        index: [
          'metrics-endpoint.metadata-*',
          'metrics-endpoint.metadata_current_*',
          '.metrics-endpoint.metadata_united_default',
        ],
        ignore_unavailable: true,
        allow_no_indices: true,
      },
      { signal: context.abortSignal }
    );
    expect(output.unauthorized).toEqual([]);
    expect(output.unavailable).toEqual([]);
    if (isServerless) {
      expect(client.cat.nodes).not.toHaveBeenCalled();
      expect(output.configurations?.nodes).toBeUndefined();
    } else {
      expect(client.cat.nodes).toHaveBeenCalledWith(
        { format: 'json', h: 'node.role' },
        { signal: context.abortSignal }
      );
      expect(output.configurations?.nodes).toEqual({ count: 0, roles: {} });
    }
  });

  it('omits freshness when the package response has no item', async () => {
    const context = createContext({ include_configurations: false });
    jest.mocked(context.contextManager.callKibanaApi).mockResolvedValue({
      status: 200,
      headers: {},
      body: {},
    });

    const { output } = await getEndpointPackageStatusStepDefinition.handler(context);

    expect(output?.package).toBeNull();
    expect(output?.stale).toBeUndefined();
    expect(output?.unavailable).toEqual(['package_freshness']);
    expect(output?.unauthorized).toEqual([]);
  });

  it.each(['node_failures', 'task_failures'])(
    'preserves transform stats and marks configurations unavailable for %s',
    async (failureField) => {
      const context = createReadableContext();
      jest.mocked(context.contextManager.callKibanaApi).mockImplementation(async ({ path }) => ({
        status: 200,
        headers: {},
        body:
          path === TRANSFORMS_ROUTE
            ? {
                transforms: [
                  {
                    id: 'endpoint.metadata_current-default',
                    state: 'started',
                    stats: { documents_processed: 42 },
                  },
                ],
                [failureField]: [{ reason: 'stats unavailable' }],
              }
            : { item: { name: 'endpoint', version: '9.4.0' } },
      }));

      const { output } = await getEndpointPackageStatusStepDefinition.handler(context);

      expect(output?.configurations?.transforms).toEqual([
        {
          id: 'endpoint.metadata_current-default',
          state: 'started',
          stats: { documents_processed: 42 },
          failing: false,
        },
      ]);
      expect(output?.unavailable).toEqual(['package_configurations']);
      expect(output?.unauthorized).toEqual([]);
    }
  );

  it('reports an empty metadata settings response as unavailable', async () => {
    const context = createReadableContext();
    jest
      .spyOn(context.contextManager.getScopedEsClient().indices, 'getSettings')
      .mockResolvedValue({});

    const result = await getEndpointPackageStatusStepDefinition.handler(context);

    const output = getEndpointPackageStatusOutputSchema.parse(result.output);

    expect(output.configurations?.indices).toBeUndefined();
    expect(output.unavailable).toEqual(['package_configurations']);
  });

  it.each(['kibana', 'elasticsearch'])('stops on cancellation during a %s read', async (read) => {
    const context = createReadableContext();
    const controller = new AbortController();
    context.abortSignal = controller.signal;
    const abortError = new Error('cancelled');
    const abort = jest.fn().mockImplementation(() => {
      controller.abort(abortError);
      return Promise.reject(abortError);
    });
    const client = context.contextManager.getScopedEsClient();
    if (read === 'kibana') {
      jest.mocked(context.contextManager.callKibanaApi).mockImplementationOnce(abort);
    } else {
      jest.spyOn(client.transform, 'getTransform').mockImplementationOnce(abort);
    }

    await expect(getEndpointPackageStatusStepDefinition.handler(context)).rejects.toThrow();
    expect(client.indices.getSettings).not.toHaveBeenCalled();
    expect(client.ingest.getPipeline).not.toHaveBeenCalled();
    expect(client.cat.nodes).not.toHaveBeenCalled();
  });

  it('does not start reads after cancellation', async () => {
    const context = createContext({ include_configurations: false });
    const controller = new AbortController();
    controller.abort();
    context.abortSignal = controller.signal;

    await expect(getEndpointPackageStatusStepDefinition.handler(context)).rejects.toThrow();
    expect(context.contextManager.callKibanaApi).not.toHaveBeenCalled();
    expect(context.contextManager.getScopedEsClient).not.toHaveBeenCalled();
  });

  it('returns freshness and degrades the denied reads into unauthorized parts', async () => {
    const context = createContext({ include_configurations: true });

    const result = await getEndpointPackageStatusStepDefinition.handler(context);
    const output = getEndpointPackageStatusOutputSchema.parse(result.output);

    expect(output.package).toEqual({
      name: 'endpoint',
      version: '9.4.0',
      latestVersion: '9.5.0',
      installationInfo: { version: '9.4.0', install_status: 'installed' },
    });
    expect(output.stale).toBe(true);
    expect(output.configurations).toBeUndefined();
    expect(output.unauthorized).toEqual(
      expect.arrayContaining(['package_configurations', 'package_default_settings'])
    );
    expect(output.unavailable).toEqual([]);

    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: TRANSFORMS_ROUTE,
      headers: { 'elastic-api-version': '1' },
    });
    expect(context.contextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: `${PACKAGE_ROUTE}/9.4.0/elasticsearch/transform/metadata_current/default.json`,
    });
  });
});
