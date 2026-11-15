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
import { installAesopExplorerAgent } from './explorer_agent';
import {
  AesopExplorerDefaultError,
  resolveDefaultConnectorId,
  resolveDefaultDatasetId,
  resolveDefaultInvestigationId,
} from './explorer_defaults';

jest.mock('./explorer_defaults', () => ({
  ...jest.requireActual('./explorer_defaults'),
  resolveDefaultConnectorId: jest.fn(),
  resolveDefaultDatasetId: jest.fn(),
  resolveDefaultInvestigationId: jest.fn(),
}));

jest.mock('./explorer_agent', () => ({
  installAesopExplorerAgent: jest.fn(),
}));

jest.mock('./explorer_schedule', () => ({
  ...jest.requireActual('./explorer_schedule'),
  enableAesopExplorer: jest.fn(),
  uninstallAesopExplorer: jest.fn(),
}));

const enableMock = enableAesopExplorer as jest.MockedFunction<typeof enableAesopExplorer>;
const uninstallMock = uninstallAesopExplorer as jest.MockedFunction<typeof uninstallAesopExplorer>;
const installAgentMock = installAesopExplorerAgent as jest.MockedFunction<
  typeof installAesopExplorerAgent
>;
const resolveConnectorMock = resolveDefaultConnectorId as jest.MockedFunction<
  typeof resolveDefaultConnectorId
>;
const resolveDatasetMock = resolveDefaultDatasetId as jest.MockedFunction<
  typeof resolveDefaultDatasetId
>;
const resolveInvestigationMock = resolveDefaultInvestigationId as jest.MockedFunction<
  typeof resolveDefaultInvestigationId
>;

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
  const agentBuilder = { agents: { ensure: jest.fn() } };

  const createContext = (): SecuritySolutionRequestHandlerContext =>
    ({
      licensing: Promise.resolve({ license: { hasAtLeast } }),
      core: Promise.resolve({ uiSettings: { client: {} } }),
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
    resolveConnectorMock.mockResolvedValue('default-conn');
    resolveDatasetMock.mockResolvedValue('default-ds');
    resolveInvestigationMock.mockResolvedValue('default-inv');
    installAgentMock.mockResolvedValue(undefined);

    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(
      {} as Awaited<ReturnType<typeof workflowsExtensions.initManagedWorkflowsClient>>
    );
    const getStartServices = jest.fn().mockResolvedValue([
      coreMock.createStart(),
      {
        workflowsExtensions,
        agentBuilder,
        spaces: { spacesService: { getSpaceId: spaceIdFor } },
      },
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
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        document_id: 'doc-1',
        connector_id: 'connector-1',
        dataset_id: 'dataset-1',
        investigation_id: 'inv-1',
      },
    });
    expect(resolveConnectorMock).not.toHaveBeenCalled();
    expect(resolveDatasetMock).not.toHaveBeenCalled();
    expect(resolveInvestigationMock).not.toHaveBeenCalled();
  });

  it('resolves omitted ids from the space defaults', async () => {
    await post({ mode: 'discovery' });

    expect(enableMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        connectorId: 'default-conn',
        datasetId: 'default-ds',
        investigationId: 'default-inv',
      })
    );
    expect(resolveDatasetMock).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'sec' }));
  });

  it('installs the explorer agent in the request space when it is the A/B agent', async () => {
    await post({ ...validBody, ab_agent_id: AESOP_EXPLORER_AGENT_ID });

    expect(installAgentMock).toHaveBeenCalledWith({ agentBuilder, spaceId: 'sec' });
  });

  it('does not install the explorer agent for a custom A/B agent', async () => {
    await post({ ...validBody, ab_agent_id: 'agent-1' });

    expect(installAgentMock).not.toHaveBeenCalled();
  });

  it('rejects a resolved default id that the body schema would refuse', async () => {
    resolveConnectorMock.mockResolvedValue('{{ steps.x.output }}');

    await post({ mode: 'discovery' });

    expect(enableMock).not.toHaveBeenCalled();
    expect(resolveDatasetMock).not.toHaveBeenCalled();
    expect(resolveInvestigationMock).not.toHaveBeenCalled();
    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('connectorId') },
    });
  });

  it('accepts a body with only the mode', () => {
    expect(
      validate('post', AESOP_EXPLORER_ROUTE_PATH, 'body', { mode: 'discovery' })
    ).toHaveProperty('value');
  });

  it('returns the status of a defaults failure without enabling', async () => {
    resolveDatasetMock.mockRejectedValue(new AesopExplorerDefaultError('needs manage_evals', 403));

    await post({ mode: 'discovery' });

    expect(enableMock).not.toHaveBeenCalled();
    expect(mockResponse.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: { message: 'needs manage_evals' },
    });
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
