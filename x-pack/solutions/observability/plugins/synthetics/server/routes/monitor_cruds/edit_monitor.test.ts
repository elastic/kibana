/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncEditedMonitor, uiMonitorContainsBacktickInInlineScript } from './edit_monitor';
import { SavedObject } from '@kbn/core/server';
import {
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types';
import { getRouteContextMock } from '../../mocks/route_context_mock';

jest.mock('../telemetry/monitor_upgrade_sender', () => ({
  sendTelemetryEvents: jest.fn(),
  formatTelemetryUpdateEvent: jest.fn(),
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
      })
    );
  });
});

describe('uiMonitorContainsBacktickInInlineScript', () => {
  const baseBrowserMonitor = {
    type: 'browser',
    origin: 'ui',
  } as any;

  it('returns true when inline script contains a backtick', () => {
    const monitor = {
      ...baseBrowserMonitor,
      'source.inline.script': 'step(`foo`, () => {})',
    } as any;

    expect(uiMonitorContainsBacktickInInlineScript(monitor)).toBe(true);
  });

  it('returns false when inline script does not contain a backtick', () => {
    const monitor = {
      ...baseBrowserMonitor,
      'source.inline.script': 'step("foo", () => {})',
    } as any;

    expect(uiMonitorContainsBacktickInInlineScript(monitor)).toBe(false);
  });

  it('returns false for non-browser monitors', () => {
    const monitor = {
      type: 'http',
      origin: 'ui',
      urls: 'https://elastic.co',
    } as any;

    expect(uiMonitorContainsBacktickInInlineScript(monitor)).toBe(false);
  });
});
