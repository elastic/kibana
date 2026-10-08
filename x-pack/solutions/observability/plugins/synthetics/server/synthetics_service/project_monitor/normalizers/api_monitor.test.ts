/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
import type { APIFields, Locations, ProjectMonitor } from '../../../../common/runtime_types';
import {
  ConfigKey,
  FormMonitorType,
  LocationStatus,
  MonitorTypeEnum,
} from '../../../../common/runtime_types';
import { normalizeProjectMonitors } from '.';
import type { PrivateLocationAttributes } from '../../../runtime_types/private_locations';

// normalizeProjectMonitors returns NormalizerResult<HTTPFields | TCPFields | ...>
// because the dispatch is a runtime switch on monitor.type. Narrow back to
// APIFields here — every test in this file pushes a `type: api` monitor.
const asApi = (fields: unknown) => fields as APIFields;

describe('api normalizers', () => {
  const projectId = 'test-project-id';
  const locations: Locations = [
    {
      id: 'us_central',
      label: 'Test Location',
      geo: { lat: 33.333, lon: 73.333 },
      url: 'test-url',
      isServiceManaged: true,
      status: LocationStatus.GA,
    },
  ];
  const privateLocations: PrivateLocationAttributes[] = [];

  it('emits monitor.type=api and the API form type', () => {
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.API,
        id: 'orders-api-health',
        name: 'Orders API health',
        schedule: 1,
        content: 'apiJourney("orders", () => {})',
        locations: ['us_central'],
        tags: 'api',
      },
    ];

    const [actual] = normalizeProjectMonitors({
      locations,
      privateLocations,
      monitors,
      projectId,
      namespace: 'test-space',
      version: '9.5.0',
    });

    const fields = asApi(actual.normalizedFields);
    expect(fields[ConfigKey.MONITOR_TYPE]).toBe(MonitorTypeEnum.API);
    expect(fields[ConfigKey.FORM_MONITOR_TYPE]).toBe(FormMonitorType.API);
    expect(fields[ConfigKey.SOURCE_PROJECT_CONTENT]).toBe('apiJourney("orders", () => {})');
  });

  it('keeps playwrightOptions and ignoreHTTPSErrors (both apply to APIRequestContext)', () => {
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.API,
        id: 'with-pw-opts',
        name: 'with playwright opts',
        schedule: 5,
        content: 'apiJourney(...)',
        playwrightOptions: { extraHTTPHeaders: { 'x-api-key': 'abc' } },
        ignoreHTTPSErrors: true,
        locations: ['us_central'],
      },
    ];

    const [actual] = normalizeProjectMonitors({
      locations,
      privateLocations,
      monitors,
      projectId,
      namespace: 'test-space',
      version: '9.5.0',
    });

    const fields = asApi(actual.normalizedFields);
    expect(fields[ConfigKey.IGNORE_HTTPS_ERRORS]).toBe(true);
    expect(fields[ConfigKey.PLAYWRIGHT_OPTIONS]).toBe(
      JSON.stringify({ extraHTTPHeaders: { 'x-api-key': 'abc' } })
    );
  });

  it('omits screenshots and throttling entirely (API has no browser/CDP)', () => {
    // SCREENSHOTS / THROTTLING_CONFIG are browser/CDP-specific: there is no
    // browser to screenshot, and raw HTTP doesn't go through Chromium's CDP
    // network throttling. API's own codec (APIAdvancedFieldsCodec) omits both
    // rather than carrying them as inert values, so they must not appear on
    // a normalized API monitor at all.
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.API,
        id: 'minimal',
        name: 'minimal api',
        schedule: 1,
        content: 'apiJourney(...)',
        locations: ['us_central'],
      },
    ];

    const [actual] = normalizeProjectMonitors({
      locations,
      privateLocations,
      monitors,
      projectId,
      namespace: 'test-space',
      version: '9.5.0',
    });

    const fields = asApi(actual.normalizedFields);
    expect(ConfigKey.SCREENSHOTS in fields).toBe(false);
    expect(ConfigKey.THROTTLING_CONFIG in fields).toBe(false);
  });

  it('reports unsupportedKeys as empty (API monitors do not strip unknown fields)', () => {
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.API,
        id: 'minimal',
        name: 'minimal api',
        schedule: 1,
        content: 'apiJourney(...)',
        locations: ['us_central'],
      },
    ];

    const [actual] = normalizeProjectMonitors({
      locations,
      privateLocations,
      monitors,
      projectId,
      namespace: 'test-space',
      version: '9.5.0',
    });

    expect(actual.unsupportedKeys).toEqual([]);
  });

  it('forwards maintenance window ids onto the saved object', () => {
    const maintenanceWindows = [
      { id: 'mw-1', title: 'First maintenance window' },
    ] as unknown as MaintenanceWindow[];
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.API,
        id: 'with-mw',
        name: 'with maintenance window',
        schedule: 1,
        content: 'apiJourney(...)',
        locations: ['us_central'],
        maintenanceWindows: ['mw-1'],
      },
    ];

    const [actual] = normalizeProjectMonitors({
      locations,
      privateLocations,
      monitors,
      projectId,
      namespace: 'test-space',
      version: '9.5.0',
      maintenanceWindows,
    });

    expect(asApi(actual.normalizedFields)[ConfigKey.MAINTENANCE_WINDOWS]).toEqual(['mw-1']);
  });

  it('throws when a referenced maintenance window is unavailable', () => {
    const monitors: ProjectMonitor[] = [
      {
        type: MonitorTypeEnum.API,
        id: 'missing-mw',
        name: 'missing maintenance window',
        schedule: 1,
        content: 'apiJourney(...)',
        locations: ['us_central'],
        maintenanceWindows: ['mw-1'],
      },
    ];

    expect(() =>
      normalizeProjectMonitors({
        locations,
        privateLocations,
        monitors,
        projectId,
        namespace: 'test-space',
        version: '9.5.0',
        maintenanceWindows: [],
      })
    ).toThrow(/mw-1/);
  });
});
