/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { editSyntheticsMonitorRoute, syncEditedMonitor } from './edit_monitor';
import type { SavedObject } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { ConfigKey } from '../../../common/runtime_types';
import type {
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types';
import { getRouteContextMock } from '../../mocks/route_context_mock';

jest.mock('@kbn/fleet-plugin/server/services/package_policy', () => ({
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('fleet-package-policies'),
}));

jest.mock('../telemetry/monitor_upgrade_sender', () => ({
  sendTelemetryEvents: jest.fn(),
  formatTelemetryUpdateEvent: jest.fn(),
}));

// Only used by editSyntheticsMonitorRoute (not syncEditedMonitor, tested below),
// mocked here to reach the route's space-authorization check without exercising
// the full monitor/location validation and normalization pipeline.
jest.mock('./monitor_locations_utils', () => ({
  assertCanPerformMonitorBulkActionInAllSpaces: jest.fn(),
  validateMonitorPrivateLocationSpaces: jest.fn().mockReturnValue(null),
}));

jest.mock('./monitor_validation', () => {
  const actual = jest.requireActual('./monitor_validation');
  return {
    ...actual,
    validateMonitor: jest.fn(),
    normalizeAPIConfig: jest.fn(),
  };
});

jest.mock('./formatters/saved_object_to_monitor', () => ({
  mergeSourceMonitor: jest.fn(),
  mapSavedObjectToMonitor: jest.fn(),
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      expect.any(Object)
    );
  });

  it('passes package policy references when monitor has private locations', async () => {
    const monitorWithPrivateLocation = {
      ...editedMonitor,
      locations: [
        { id: 'loc-1', label: 'loc-1', agentPolicyId: 'agent-1', isServiceManaged: false },
      ],
    } as unknown as SyntheticsMonitor;

    (serverMock.authSavedObjectsClient?.update as jest.Mock).mockResolvedValue({
      id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      type: 'synthetics-monitor',
      attributes: {},
      references: [],
    });

    routeContext.syntheticsMonitorClient.editMonitors = jest.fn().mockResolvedValue({
      failedPolicyUpdates: [],
      publicSyncErrors: [],
    });

    await syncEditedMonitor({
      normalizedMonitor: monitorWithPrivateLocation,
      decryptedPreviousMonitor:
        previousMonitor as unknown as SavedObject<SyntheticsMonitorWithSecretsAttributes>,
      routeContext,
      spaceId: 'test-space',
    });

    expect(serverMock.authSavedObjectsClient?.update).toHaveBeenCalledWith(
      'synthetics-monitor',
      '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      expect.any(Object),
      expect.objectContaining({
        references: [
          {
            id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d-loc-1',
            name: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d-loc-1',
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          },
        ],
      })
    );
  });

  it('does not pass references when monitor has no private locations', async () => {
    // editedMonitor only has a service-managed (public) location
    await syncEditedMonitor({
      normalizedMonitor: editedMonitor,
      decryptedPreviousMonitor:
        previousMonitor as unknown as SavedObject<SyntheticsMonitorWithSecretsAttributes>,
      routeContext,
      spaceId: 'test-space',
    });

    expect(serverMock.authSavedObjectsClient?.update).toHaveBeenCalledWith(
      'synthetics-monitor',
      '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
      expect.any(Object),
      expect.objectContaining({ references: undefined })
    );
  });
});

describe('editSyntheticsMonitorRoute', () => {
  const monitorId = '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d';

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

    // Drop the previous monitor's `locations` from the merge so the edit is
    // treated as a private-only, location-unchanged update - keeping this test
    // focused on space authorization instead of the location-parsing paths.
    const { mergeSourceMonitor } = jest.requireMock('./formatters/saved_object_to_monitor');
    mergeSourceMonitor.mockImplementation(
      (prevAttrs: Record<string, unknown>, patch: Record<string, unknown>) => {
        const { locations, ...restPrev } = prevAttrs;
        return { ...restPrev, ...patch };
      }
    );
  });

  it("authorizes the union of the monitor's previous and newly-submitted spaces, not just the new ones", async () => {
    const { assertCanPerformMonitorBulkActionInAllSpaces } = jest.requireMock(
      './monitor_locations_utils'
    );
    const forbidden = { status: 403 };
    assertCanPerformMonitorBulkActionInAllSpaces.mockResolvedValue(forbidden);

    const { routeContext } = getRouteContextMock();
    routeContext.request = {
      params: { monitorId },
      query: {},
      body: { [ConfigKey.KIBANA_SPACES]: ['space-a'] },
    } as any;
    routeContext.spaceId = 'default';
    routeContext.monitorConfigRepository.getDecrypted = jest.fn().mockResolvedValue({
      decryptedMonitor: {
        id: monitorId,
        type: 'synthetics-monitor-multi-space',
        // The monitor currently lives in both spaces; the request below drops
        // 'space-b' from KIBANA_SPACES without the caller having update rights
        // there.
        namespaces: ['space-a', 'space-b'],
      },
      normalizedMonitor: {
        id: monitorId,
        attributes: {
          origin: 'ui',
          [ConfigKey.MONITOR_TYPE]: 'http',
          [ConfigKey.REVISION]: 3,
          locations: [
            { id: 'pl-1', label: 'PL 1', isServiceManaged: false, agentPolicyId: 'ap-1' },
          ],
        },
      },
    });

    const result = await editSyntheticsMonitorRoute().handler(routeContext);

    expect(result).toBe(forbidden);
    expect(assertCanPerformMonitorBulkActionInAllSpaces).toHaveBeenCalledTimes(1);
    const [, spacesArg] = assertCanPerformMonitorBulkActionInAllSpaces.mock.calls[0];
    // 'space-b' was dropped from the submitted payload but must still be
    // authorized - removing a monitor from a space is itself a change that
    // requires bulk_update privileges there.
    expect(spacesArg).toEqual(expect.arrayContaining(['space-a', 'space-b']));
    expect(spacesArg).toHaveLength(2);
  });
});
