/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { editSyntheticsMonitorRoute, syncEditedMonitor } from './edit_monitor';
import { SavedObject } from '@kbn/core/server';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types';
import { AddEditMonitorAPI } from './add_monitor/add_monitor_api';
import { getRouteContextMock } from '../../mocks/route_context_mock';

jest.mock('../telemetry/monitor_upgrade_sender', () => ({
  sendTelemetryEvents: jest.fn(),
  formatTelemetryUpdateEvent: jest.fn(),
}));

jest.mock('./monitor_locations_utils', () => {
  const actual = jest.requireActual('./monitor_locations_utils');
  return {
    ...actual,
    assertCanPerformMonitorBulkActionInAllSpaces: jest.fn(),
  };
});

jest.mock('./monitor_validation', () => {
  const actual = jest.requireActual('./monitor_validation');
  return {
    ...actual,
    validateMonitor: jest.fn().mockImplementation(actual.validateMonitor),
    normalizeAPIConfig: jest.fn().mockImplementation(actual.normalizeAPIConfig),
  };
});

describe('syncEditedMonitor', () => {
  const editedMonitor = {
    type: 'http',
    enabled: true,
    schedule: {
      number: '3',
      unit: 'm',
    },
    name: 'my mon',
    locations: [
      {
        id: 'test_location',
        isServiceManaged: true,
      },
    ],
    urls: 'http://google.com',
    max_redirects: '0',
    password: '',
    proxy_url: '',
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
    fields_under_root: true,
  } as unknown as SyntheticsMonitor;

  const previousMonitor = {
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    attributes: { name: editedMonitor.name, locations: [] } as any,
    type: 'synthetics-monitor',
    references: [],
  } as SavedObject<EncryptedSyntheticsMonitorAttributes>;

  const { routeContext, syntheticsService, serverMock } = getRouteContextMock();
  syntheticsService.editConfig = jest.fn();
  syntheticsService.getMaintenanceWindows = jest.fn();

  it('includes the isEdit flag', async () => {
    await syncEditedMonitor({
      normalizedMonitor: editedMonitor,
      decryptedPreviousMonitor:
        previousMonitor as unknown as SavedObject<SyntheticsMonitorWithSecretsAttributes>,
      routeContext,
      spaceId: 'test-space',
    });

    expect(syntheticsService.editConfig).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          configId: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
        }),
      ]),
      true,
      undefined
    );

    expect(serverMock.authSavedObjectsClient?.update).toHaveBeenCalledWith(
      'synthetics-monitor',
      '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      expect.objectContaining({
        enabled: true,
      }),
      { mergeAttributes: false }
    );
  });
});

describe('editSyntheticsMonitorRoute space authorization', () => {
  const monitorId = '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d';
  let normalizeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    const { validateMonitor, normalizeAPIConfig } = jest.requireMock('./monitor_validation');
    normalizeAPIConfig.mockImplementation((m: Record<string, unknown>) => ({ formattedConfig: m }));
    validateMonitor.mockImplementation((m: Record<string, unknown>) => ({
      valid: true,
      reason: '',
      details: '',
      payload: m,
      decodedMonitor: m,
    }));

    normalizeSpy = jest
      .spyOn(AddEditMonitorAPI.prototype, 'normalizeMonitor')
      .mockImplementation(async (cfg) => cfg as SyntheticsMonitor);
  });

  afterEach(() => {
    normalizeSpy.mockRestore();
  });

  const runEdit = async ({
    namespaces,
    payloadSpaces,
  }: {
    namespaces: string[];
    payloadSpaces: string[];
  }) => {
    const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
      './monitor_locations_utils'
    );
    const forbidden = { status: 403 };
    assertCanPerformMonitorBulkActionInAllSpaces.mockResolvedValue(forbidden);

    const { routeContext } = getRouteContextMock();
    routeContext.request = {
      params: { monitorId },
      query: {},
      body: { [ConfigKey.KIBANA_SPACES]: payloadSpaces },
    } as any;
    routeContext.spaceId = 'space-a';
    routeContext.monitorConfigRepository.getDecrypted = jest.fn().mockResolvedValue({
      decryptedMonitor: {
        id: monitorId,
        type: 'synthetics-monitor',
        namespaces,
      },
      normalizedMonitor: {
        id: monitorId,
        attributes: {
          origin: 'ui',
          [ConfigKey.MONITOR_TYPE]: 'http',
          [ConfigKey.REVISION]: 3,
          locations: [],
        },
      },
    });

    const result = await editSyntheticsMonitorRoute().handler(routeContext);
    return { result, forbidden, assertCanPerformMonitorBulkActionInAllSpaces };
  };

  it('authorizes the union of previous namespaces and submitted spaces', async () => {
    const { result, forbidden, assertCanPerformMonitorBulkActionInAllSpaces } = await runEdit({
      namespaces: ['space-a', 'space-b'],
      payloadSpaces: ['space-a'],
    });

    expect(result).toBe(forbidden);
    expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledTimes(1);
    const [, spacesArg] = assertCanPerformMonitorBulkActionInAllSpaces.mock.calls[0];
    expect(spacesArg).toEqual(expect.arrayContaining(['space-a', 'space-b']));
    expect(spacesArg).toHaveLength(2);
  });

  it('authorizes a newly submitted space that the monitor was not previously shared to', async () => {
    const { result, forbidden, assertCanPerformMonitorBulkActionInAllSpaces } = await runEdit({
      namespaces: ['space-a'],
      payloadSpaces: ['space-a', 'space-b'],
    });

    expect(result).toBe(forbidden);
    const [, spacesArg] = assertCanPerformMonitorBulkActionInAllSpaces.mock.calls[0];
    expect(spacesArg).toEqual(expect.arrayContaining(['space-a', 'space-b']));
    expect(spacesArg).toHaveLength(2);
  });
});
