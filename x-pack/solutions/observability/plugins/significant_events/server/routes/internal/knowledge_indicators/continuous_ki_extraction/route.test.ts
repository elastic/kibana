/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiSettingsServiceMock } from '@kbn/core/server/mocks';
import {
  OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_INTERVAL_HOURS,
} from '@kbn/management-settings-ids';
import { internalKIContinuousKIExtractionRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalKIContinuousKIExtractionRoutes[
    'PUT /internal/streams/_knowledge_indicators/continuous_ki_extraction/settings'
  ];

type HandlerParams = Parameters<typeof route.handler>[0];

const SPACE_ID = 'space-a';
const DEFAULT_INTERVAL_HOURS = 12;

const setup = ({
  enabled = false,
  ensureWorkflowError,
}: {
  enabled?: boolean;
  ensureWorkflowError?: Error;
} = {}) => {
  const uiSettingsClient = uiSettingsServiceMock.createClient();
  uiSettingsClient.getAll.mockResolvedValue({
    [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_ENABLED]: enabled,
    [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]: DEFAULT_INTERVAL_HOURS,
  });
  uiSettingsClient.setMany.mockResolvedValue();
  const ensureWorkflow = ensureWorkflowError
    ? jest.fn().mockRejectedValue(ensureWorkflowError)
    : jest.fn().mockResolvedValue(undefined);
  const request = { spaceId: SPACE_ID };

  const call = (continuousKiExtraction: { enabled?: boolean; intervalHours?: number }) =>
    route.handler({
      params: { body: { continuousKiExtraction } },
      request,
      // Only the space client is returned: a global settings read or write fails the test.
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {}, uiSettingsClient }),
      server: {},
      continuousOnboardingWorkflowService: { ensureWorkflow },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      logger: { warn: jest.fn() },
    } as unknown as HandlerParams);

  return { call, uiSettingsClient, ensureWorkflow, request };
};

describe('PUT continuous_ki_extraction/settings', () => {
  it('writes the enabled flag and interval to the settings of the request space', async () => {
    const { call, uiSettingsClient } = setup();

    await expect(call({ enabled: true, intervalHours: 6 })).resolves.toEqual({ success: true });

    expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
      [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_ENABLED]: true,
      [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]: 6,
    });
  });

  it('installs the workflow of the request space when continuous onboarding turns on', async () => {
    const { call, ensureWorkflow, request } = setup({ enabled: false });

    await call({ enabled: true });

    expect(ensureWorkflow).toHaveBeenCalledTimes(1);
    expect(ensureWorkflow).toHaveBeenCalledWith({ enabled: true, request, spaceId: SPACE_ID });
  });

  it('removes the workflow of the request space when continuous onboarding turns off', async () => {
    const { call, ensureWorkflow, request } = setup({ enabled: true });

    await call({ enabled: false });

    expect(ensureWorkflow).toHaveBeenCalledWith({ enabled: false, request, spaceId: SPACE_ID });
  });

  it('leaves the workflow alone when the enabled flag does not change', async () => {
    const { call, ensureWorkflow } = setup({ enabled: true });

    await call({ enabled: true });

    expect(ensureWorkflow).not.toHaveBeenCalled();
  });

  it('only stores an interval change, since the workflow reads the interval on every run', async () => {
    const { call, ensureWorkflow, uiSettingsClient } = setup({ enabled: true });

    await call({ intervalHours: 24 });

    expect(ensureWorkflow).not.toHaveBeenCalled();
    expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
      [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]: 24,
    });
  });

  it('rolls the settings back and rethrows when the workflow reconcile fails', async () => {
    const { call, uiSettingsClient } = setup({
      enabled: false,
      ensureWorkflowError: new Error('install failed'),
    });

    await expect(call({ enabled: true, intervalHours: 6 })).rejects.toThrow('install failed');

    expect(uiSettingsClient.setMany).toHaveBeenLastCalledWith({
      [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_ENABLED]: false,
      [OBSERVABILITY_SIGNIFICANT_EVENTS_CONTINUOUS_ONBOARDING_INTERVAL_HOURS]:
        DEFAULT_INTERVAL_HOURS,
    });
  });
});
