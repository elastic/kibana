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
  AESOP_DRIFT_MONITOR_ROUTE_PATH,
  AESOP_DRIFT_MONITOR_THRESHOLD,
} from '../../common/aesop_prototype';
import { enableAesopDriftMonitor, uninstallAesopDriftMonitor } from './drift_monitor_schedule';
import { registerAesopDriftMonitorRoutes } from './drift_monitor_routes';

jest.mock('./drift_monitor_schedule', () => ({
  ...jest.requireActual('./drift_monitor_schedule'),
  enableAesopDriftMonitor: jest.fn(),
  uninstallAesopDriftMonitor: jest.fn(),
}));

const enableMock = enableAesopDriftMonitor as jest.MockedFunction<typeof enableAesopDriftMonitor>;
const uninstallMock = uninstallAesopDriftMonitor as jest.MockedFunction<
  typeof uninstallAesopDriftMonitor
>;

describe('registerAesopDriftMonitorRoutes', () => {
  let router: RouterMock;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let uiSettingsGet: jest.Mock;
  let skillsRegistryGet: jest.Mock;
  let hasAtLeast: jest.Mock;

  const createContext = (): SecuritySolutionRequestHandlerContext =>
    ({
      licensing: Promise.resolve({ license: { hasAtLeast } }),
      core: Promise.resolve({ uiSettings: { client: { get: uiSettingsGet } } }),
    } as unknown as SecuritySolutionRequestHandlerContext);

  const postHandler = () =>
    router.versioned.getRoute('post', AESOP_DRIFT_MONITOR_ROUTE_PATH).versions['1'].handler;

  const postRequest = (body: Record<string, unknown>) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: AESOP_DRIFT_MONITOR_ROUTE_PATH,
      body,
    });

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
    uiSettingsGet = jest.fn().mockResolvedValue(true);
    skillsRegistryGet = jest.fn().mockResolvedValue({ name: 'Alert triage' });
    enableMock.mockResolvedValue({ documentId: 'doc-1' } as Awaited<
      ReturnType<typeof enableAesopDriftMonitor>
    >);
    uninstallMock.mockResolvedValue(undefined);

    const workflowsExtensions = workflowsExtensionsMock.createStart();
    workflowsExtensions.initManagedWorkflowsClient.mockResolvedValue(
      {} as Awaited<ReturnType<typeof workflowsExtensions.initManagedWorkflowsClient>>
    );
    const getStartServices = jest.fn().mockResolvedValue([
      coreMock.createStart(),
      {
        workflowsExtensions,
        agentBuilder: {
          skills: { getRegistry: jest.fn().mockResolvedValue({ get: skillsRegistryGet }) },
        },
      },
      undefined,
    ]);

    registerAesopDriftMonitorRoutes({
      router: router as unknown as SecuritySolutionPluginRouter,
      getStartServices: getStartServices as unknown as StartServicesAccessor<StartPlugins>,
      logger: loggerMock.create(),
      getEnablementApi: () => undefined,
    });
  });

  it('enables the monitor with the resolved skill name', async () => {
    await postHandler()(createContext(), postRequest({ skill_id: 'triage' }), mockResponse);

    expect(enableMock).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' }),
      expect.objectContaining({ skillId: 'triage', skillName: 'Alert triage' })
    );
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { document_id: 'doc-1', warnings: [] },
    });
  });

  it('passes the drift threshold and investigation id to the monitor', async () => {
    await postHandler()(
      createContext(),
      postRequest({ skill_id: 'triage', drift_threshold: 0.6, investigation_id: 'inv-1' }),
      mockResponse
    );

    expect(enableMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ driftThreshold: 0.6, investigationId: 'inv-1' })
    );
  });

  it('defaults the drift threshold and leaves the investigation id unset', () => {
    const { value } = validate('post', AESOP_DRIFT_MONITOR_ROUTE_PATH, 'body', {
      skill_id: 'triage',
    });

    expect(value).toEqual(
      expect.objectContaining({ drift_threshold: AESOP_DRIFT_MONITOR_THRESHOLD })
    );
    expect((value as { investigation_id?: string }).investigation_id).toBeUndefined();
  });

  it.each([-0.1, 1.1])('rejects a drift threshold of %s', (driftThreshold) => {
    const { error } = validate('post', AESOP_DRIFT_MONITOR_ROUTE_PATH, 'body', {
      skill_id: 'triage',
      drift_threshold: driftThreshold,
    });

    expect(error).toBeDefined();
  });

  it('falls back to no name when the skill cannot be resolved', async () => {
    skillsRegistryGet.mockRejectedValue(new Error('not found'));

    await postHandler()(createContext(), postRequest({ skill_id: 'triage' }), mockResponse);

    expect(enableMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skillId: 'triage', skillName: undefined })
    );
    expect(mockResponse.ok).toHaveBeenCalled();
  });

  it('returns a warning per tracing setting that is off', async () => {
    uiSettingsGet.mockResolvedValue(false);

    await postHandler()(createContext(), postRequest({ skill_id: 'triage' }), mockResponse);

    const { body } = mockResponse.ok.mock.calls[0][0] as { body: { warnings: string[] } };
    expect(body.warnings).toHaveLength(2);
  });

  it('still succeeds with no warnings when the settings read fails', async () => {
    uiSettingsGet.mockRejectedValue(new Error('settings unavailable'));

    await postHandler()(createContext(), postRequest({ skill_id: 'triage' }), mockResponse);

    expect(enableMock).toHaveBeenCalled();
    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: { document_id: 'doc-1', warnings: [] },
    });
  });

  it('rejects a license below enterprise', async () => {
    hasAtLeast.mockReturnValue(false);

    await postHandler()(createContext(), postRequest({ skill_id: 'triage' }), mockResponse);

    expect(enableMock).not.toHaveBeenCalled();
    expect(mockResponse.forbidden).toHaveBeenCalled();
  });

  it.each(['triage', 'find-security-rules', 'a_b', 'a'.repeat(64)])(
    'accepts the skill id %j in the POST body',
    (skillId) => {
      expect(
        validate('post', AESOP_DRIFT_MONITOR_ROUTE_PATH, 'body', { skill_id: skillId })
      ).toHaveProperty('value');
    }
  );

  it.each(['Find-Security-Rules', 'foo.bar', '-triage', `x' OR "1"`, 'a'.repeat(65)])(
    'rejects the skill id %j in the POST body',
    (skillId) => {
      expect(
        validate('post', AESOP_DRIFT_MONITOR_ROUTE_PATH, 'body', { skill_id: skillId })
      ).toHaveProperty('error');
    }
  );

  it.each(['Find-Security-Rules', 'foo.bar', 'a'.repeat(65)])(
    'accepts the legacy skill id %j in DELETE params',
    (skillId) => {
      expect(
        validate('delete', `${AESOP_DRIFT_MONITOR_ROUTE_PATH}/{skill_id}`, 'params', {
          skill_id: skillId,
        })
      ).toHaveProperty('value');
    }
  );

  it.each(['', 'a'.repeat(129)])('rejects the skill id %j in DELETE params', (skillId) => {
    expect(
      validate('delete', `${AESOP_DRIFT_MONITOR_ROUTE_PATH}/{skill_id}`, 'params', {
        skill_id: skillId,
      })
    ).toHaveProperty('error');
  });

  it('uninstalls the monitor on DELETE', async () => {
    const handler = router.versioned.getRoute(
      'delete',
      `${AESOP_DRIFT_MONITOR_ROUTE_PATH}/{skill_id}`
    ).versions['1'].handler;

    await handler(
      createContext(),
      httpServerMock.createKibanaRequest({ method: 'delete', params: { skill_id: 'triage' } }),
      mockResponse
    );

    expect(uninstallMock).toHaveBeenCalledWith(expect.anything(), { skillId: 'triage' });
    expect(mockResponse.noContent).toHaveBeenCalled();
  });
});
