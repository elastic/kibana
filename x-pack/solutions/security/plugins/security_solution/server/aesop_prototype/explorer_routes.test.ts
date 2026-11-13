/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import type { StartPlugins } from '../plugin';
import type { SecuritySolutionPluginRouter, SecuritySolutionRequestHandlerContext } from '../types';
import {
  AESOP_EXPLORER_AGENT_ID,
  AESOP_EXPLORER_INTERVAL_MINUTES,
  AESOP_EXPLORER_ROUTE_PATH,
} from '../../common/aesop_prototype';
import { enableAesopExplorer, uninstallAesopExplorer } from './explorer_schedule';
import { registerAesopExplorerRoutes } from './explorer_routes';

jest.mock('./explorer_schedule', () => ({
  ...jest.requireActual('./explorer_schedule'),
  enableAesopExplorer: jest.fn(),
  uninstallAesopExplorer: jest.fn(),
}));

const enableMock = enableAesopExplorer as jest.MockedFunction<typeof enableAesopExplorer>;
const uninstallMock = uninstallAesopExplorer as jest.MockedFunction<typeof uninstallAesopExplorer>;

const validBody = {
  mode: 'discovery',
  connector_id: 'connector-1',
  dataset_id: 'dataset-1',
  investigation_id: 'inv-1',
};

describe('registerAesopExplorerRoutes', () => {
  let router: RouterMock;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let hasAtLeast: jest.Mock;
  let spaceIdFor: jest.Mock;

  const createContext = (): SecuritySolutionRequestHandlerContext =>
    ({
      licensing: Promise.resolve({ license: { hasAtLeast } }),
    } as unknown as SecuritySolutionRequestHandlerContext);

  const handler = (method: 'post' | 'delete', path: string) =>
    router.versioned.getRoute(method, path).versions['1'].handler;

  const validate = (
    method: 'post' | 'delete',
    path: string,
    part: 'body' | 'params',
    value: Record<string, unknown>
  ) => {
    const { config } = router.versioned.getRoute(method, path).versions['1'];
    const validation = typeof config.validate === 'function' ? config.validate() : config.validate;
    const validator = validation && validation.request?.[part];
    if (!validator || typeof validator === 'function' || !('validate' in validator)) {
      throw new Error(`Expected the ${method} route to validate its ${part} with a schema`);
    }
    try {
      return { value: validator.validate(value) };
    } catch (error) {
      return { error };
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter() as unknown as RouterMock;
    mockResponse = httpServerMock.createResponseFactory();
    hasAtLeast = jest.fn().mockReturnValue(true);
    spaceIdFor = jest.fn().mockReturnValue('sec');
    enableMock.mockResolvedValue({ documentId: 'doc-1' });
    uninstallMock.mockResolvedValue(undefined);

    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(
      {} as Awaited<ReturnType<typeof workflowsExtensions.initManagedWorkflowsClient>>
    );
    const getStartServices = jest
      .fn()
      .mockResolvedValue([
        coreMock.createStart(),
        { workflowsExtensions, spaces: { spacesService: { getSpaceId: spaceIdFor } } },
        undefined,
      ]);

    registerAesopExplorerRoutes({
      router: router as unknown as SecuritySolutionPluginRouter,
      getStartServices: getStartServices as unknown as StartServicesAccessor<StartPlugins>,
      logger: loggerMock.create(),
      getEnablementApi: () => undefined,
    });
  });

  const post = (body: Record<string, unknown>) =>
    handler('post', AESOP_EXPLORER_ROUTE_PATH)(
      createContext(),
      httpServerMock.createKibanaRequest({ method: 'post', path: AESOP_EXPLORER_ROUTE_PATH, body }),
      mockResponse
    );

  it('enables the explorer in the request space with the body values', async () => {
    await post({ ...validBody, mode: 'telemetry', interval_minutes: 60, ab_agent_id: 'agent-1' });

    expect(enableMock).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'sec' }), {
      mode: 'telemetry',
      intervalMinutes: 60,
      connectorId: 'connector-1',
      datasetId: 'dataset-1',
      abAgentId: 'agent-1',
      investigationId: 'inv-1',
    });
    expect(mockResponse.ok).toHaveBeenCalledWith({ body: { document_id: 'doc-1' } });
  });

  it('defaults the cadence and the agent', () => {
    const { value } = validate('post', AESOP_EXPLORER_ROUTE_PATH, 'body', validBody);

    expect(value).toEqual(
      expect.objectContaining({
        interval_minutes: AESOP_EXPLORER_INTERVAL_MINUTES,
        ab_agent_id: AESOP_EXPLORER_AGENT_ID,
      })
    );
  });

  it('falls back to the default space when the request has none', async () => {
    spaceIdFor.mockReturnValue(undefined);

    await post(validBody);

    expect(enableMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' }),
      expect.anything()
    );
  });

  it('returns a 500 with the message when enabling fails', async () => {
    enableMock.mockRejectedValue(new Error('no workflows management'));

    await post(validBody);

    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'no workflows management' },
    });
  });

  it('rejects a license below enterprise', async () => {
    hasAtLeast.mockReturnValue(false);

    await post(validBody);

    expect(enableMock).not.toHaveBeenCalled();
    expect(mockResponse.forbidden).toHaveBeenCalled();
  });

  it('accepts UUID and model-style ids', () => {
    expect(
      validate('post', AESOP_EXPLORER_ROUTE_PATH, 'body', {
        ...validBody,
        connector_id: 'eis-anthropic-claude-5-sonnet',
        investigation_id: '3f2b8c1e-9d4a-4f6b-8a1c-2d7e5f9b0a11',
      })
    ).toHaveProperty('value');
  });

  it.each(['discovery', 'telemetry'])('accepts the mode %j', (mode) => {
    expect(
      validate('post', AESOP_EXPLORER_ROUTE_PATH, 'body', { ...validBody, mode })
    ).toHaveProperty('value');
  });

  it.each([
    ['an unknown mode', { mode: 'other' }],
    ['a missing connector', { connector_id: undefined }],
    ['an empty dataset id', { dataset_id: '' }],
    ['an oversized investigation id', { investigation_id: 'a'.repeat(513) }],
    ['a template expression as the connector id', { connector_id: '{{ steps.x.output }}' }],
    ['a secrets expression as the dataset id', { dataset_id: '${{ secrets.key }}' }],
    ['a template tag as the agent id', { ab_agent_id: '{% raw %}' }],
    ['a quote in the investigation id', { investigation_id: "inv'1" }],
    ['an interval below the minimum', { interval_minutes: 1 }],
  ])('rejects %s', (_label, override) => {
    expect(
      validate('post', AESOP_EXPLORER_ROUTE_PATH, 'body', { ...validBody, ...override })
    ).toHaveProperty('error');
  });

  it('uninstalls the instance for the mode in the request space', async () => {
    await handler('delete', `${AESOP_EXPLORER_ROUTE_PATH}/{mode}`)(
      createContext(),
      httpServerMock.createKibanaRequest({ method: 'delete', params: { mode: 'discovery' } }),
      mockResponse
    );

    expect(uninstallMock).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'sec' }), {
      mode: 'discovery',
    });
    expect(mockResponse.noContent).toHaveBeenCalled();
  });

  it('rejects an unknown mode in DELETE params', () => {
    expect(
      validate('delete', `${AESOP_EXPLORER_ROUTE_PATH}/{mode}`, 'params', { mode: 'other' })
    ).toHaveProperty('error');
  });
});
