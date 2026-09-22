/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeCodecParity } from './test_helpers/parity';
import { DateRangeType, LocationType, StatesIndexStatusType, SummaryType } from './common';
import { CertFacetsType, CertType, GetCertsParamsType } from './certs';
import { DynamicSettingsCodec, LocationMonitorsType } from './dynamic_settings';
import { SyntheticsNetworkEventsApiResponseType } from './network_events';
import { SnapshotType } from './snapshot';
import { syntheticsCCSSettingsSchema } from './ccs_settings';
import { syntheticsMultiSpaceSettingsSchema } from './multi_space_settings';
import { APIKeyCodec } from './settings/api_key';
import {
  SyntheticsServiceApiKeySaveType,
  SyntheticsServiceApiKeyType,
} from './synthetics_service_api_key';
import { remoteMonitorInfoSchema } from './remote';
import { TLSParamsType } from './alerts/tls';
import {
  AtomicStatusCheckParamsType,
  GetMonitorAvailabilityParamsType,
  MonitorAvailabilityType,
  RangeUnitType,
  StatusCheckParamsType,
} from './alerts/status_check';
import * as zodCommon from './zod/common';
import * as zodCerts from './zod/certs';
import * as zodDynamic from './zod/dynamic_settings';
import * as zodNetwork from './zod/network_events';
import * as zodSnapshot from './zod/snapshot';
import * as zodSettings from './zod/settings';
import * as zodRemote from './zod/remote';
import * as zodAlerts from './zod/alerts';
import './zod/type_parity';

const fullCert = {
  monitors: [
    {
      name: 'Homepage',
      id: 'mon-1',
      configId: 'cfg-1',
      url: 'https://www.elastic.co',
      type: 'http',
      remote: { remoteName: 'ccs-1', kibanaUrl: 'https://remote.example' },
      spaces: ['default'],
    },
  ],
  configId: 'cfg-1',
  monitorName: 'Homepage',
  monitorId: 'mon-1',
  monitorType: 'http',
  locationId: 'us_central',
  locationName: 'US Central',
  '@timestamp': '2024-01-01T00:00:00.000Z',
  not_after: '2026-01-01T00:00:00.000Z',
  not_before: '2023-01-01T00:00:00.000Z',
  common_name: 'www.elastic.co',
  issuer: 'DigiCert',
  sha256: 'abc',
  sha1: 'def',
  monitorUrl: 'https://www.elastic.co',
  hostName: 'www.elastic.co',
  serviceName: 'web',
  errorMessage: 'expired',
  errorStackTrace: null,
  labels: { env: 'prod' },
  tags: ['web'],
  monitorTags: ['prod'],
  remote: { remoteName: 'ccs-1', kibanaUrl: 'https://remote.example' },
};

const fullNetworkEvent = {
  timestamp: '2024-01-01T00:00:00.000Z',
  requestSentTime: 1,
  loadEndTime: 2,
  url: 'https://www.elastic.co/main.js',
  certificates: {
    validFrom: '2023-01-01',
    validTo: '2026-01-01',
    issuer: 'DigiCert',
    subjectName: 'www.elastic.co',
  },
  ip: '1.2.3.4',
  method: 'GET',
  status: 200,
  mimeType: 'application/javascript',
  responseHeaders: { 'content-type': 'application/javascript' },
  requestHeaders: { accept: '*/*' },
  timings: {
    queueing: 1,
    connect: 2,
    total: 10,
    send: 1,
    blocked: 0,
    receive: 3,
    wait: 2,
    dns: 1,
    proxy: 0,
    ssl: 1,
  },
  transferSize: 1000,
  resourceSize: 800,
};

const statusFilters = {
  'monitor.type': ['http'],
  'observer.geo.name': ['us-east'],
  tags: ['prod'],
  'url.port': ['443'],
};

describeCodecParity({
  label: 'LocationType',
  ioTs: LocationType,
  zod: zodCommon.LocationType,
  valid: [{ lat: '41.25', lon: '-95.86' }],
  invalid: [{ lat: 41.25, lon: '-95.86' }, { lat: '41.25' }, null],
});

describeCodecParity({
  label: 'SummaryType',
  ioTs: SummaryType,
  zod: zodCommon.SummaryType,
  valid: [{}, { up: 1, down: 0, geo: { name: 'Iowa', location: { lat: '1', lon: '2' } } }],
  invalid: [{ up: '1' }, { geo: { name: 1 } }],
});

describeCodecParity({
  label: 'StatesIndexStatusType',
  ioTs: StatesIndexStatusType,
  zod: zodCommon.StatesIndexStatusType,
  valid: [{ indexExists: true, indices: 'heartbeat-*' }],
  invalid: [{ indexExists: true }, { indexExists: 'yes', indices: 'x' }],
});

describeCodecParity({
  label: 'DateRangeType',
  ioTs: DateRangeType,
  zod: zodCommon.DateRangeType,
  valid: [{ from: 'now-15m', to: 'now' }],
  invalid: [{ from: 'now-15m' }, { from: 1, to: 'now' }],
});

describeCodecParity({
  label: 'remoteMonitorInfoSchema',
  ioTs: remoteMonitorInfoSchema,
  zod: zodRemote.remoteMonitorInfoSchema,
  valid: [{ remoteName: 'ccs-1' }, { remoteName: 'ccs-1', kibanaUrl: 'https://remote' }],
  invalid: [{}, { remoteName: 1 }],
});

describeCodecParity({
  label: 'GetCertsParamsType',
  ioTs: GetCertsParamsType,
  zod: zodCerts.GetCertsParamsType,
  valid: [
    {},
    {
      pageIndex: 0,
      search: 'elastic',
      notValidBefore: 'now',
      notValidAfter: 'now+30d',
      from: 'now-1y',
      to: 'now',
      sortBy: 'not_after',
      direction: 'asc',
      size: 25,
      filters: { query: 'http' },
      monitorIds: ['a'],
      monitorTypes: ['http'],
      browserResourceTypes: ['document'],
      certOrigin: ['lightweight'],
      tags: ['web'],
      issuers: ['DigiCert'],
      includeBrowserCerts: true,
      remoteNames: ['ccs-1'],
      showFromAllSpaces: false,
    },
  ],
  invalid: [{ pageIndex: '0' }, { monitorIds: 'a' }],
});

describeCodecParity({
  label: 'CertType',
  ioTs: CertType,
  zod: zodCerts.CertType,
  valid: [fullCert],
  invalid: [
    { ...fullCert, configId: 1 },
    { ...fullCert, monitors: 'x' },
  ],
});

describeCodecParity({
  label: 'CertFacetsType',
  ioTs: CertFacetsType,
  zod: zodCerts.CertFacetsType,
  valid: [
    {
      monitorTypes: [{ value: 'http', count: 3 }],
      tags: [{ value: 'web', count: 2 }],
      issuers: [{ value: 'DigiCert', count: 1 }],
      resourceTypes: [{ value: 'document', count: 1 }],
      certOrigin: [{ value: 'lightweight', count: 4 }],
      expiringWithin: [{ value: '30d', count: 1 }],
    },
  ],
  invalid: [{ monitorTypes: [], tags: [], issuers: [], resourceTypes: [], certOrigin: [] }],
});

describeCodecParity({
  label: 'DynamicSettingsCodec',
  ioTs: DynamicSettingsCodec,
  zod: zodDynamic.DynamicSettingsCodec,
  valid: [
    { certAgeThreshold: 730, certExpirationThreshold: 30, defaultConnectors: [] },
    {
      certAgeThreshold: 730,
      certExpirationThreshold: 30,
      defaultConnectors: ['connector-1'],
      defaultEmail: { to: ['ops@example.com'], cc: ['sec@example.com'], bcc: [] },
      defaultTLSRuleEnabled: true,
      defaultStatusRuleEnabled: false,
      privateLocationsSyncInterval: 60,
      rebalancePrivateLocationShardsEnabled: true,
    },
  ],
  invalid: [
    { certAgeThreshold: '730', certExpirationThreshold: 30, defaultConnectors: [] },
    { certAgeThreshold: 730, certExpirationThreshold: 30 },
  ],
});

describeCodecParity({
  label: 'LocationMonitorsType',
  ioTs: LocationMonitorsType,
  zod: zodDynamic.LocationMonitorsType,
  valid: [[], [{ id: 'us_central', count: 4 }]],
  invalid: [{ id: 'us_central', count: 4 }, [{ id: 'us_central' }]],
});

describeCodecParity({
  label: 'SyntheticsNetworkEventsApiResponseType',
  ioTs: SyntheticsNetworkEventsApiResponseType,
  zod: zodNetwork.SyntheticsNetworkEventsApiResponseType,
  valid: [
    {
      events: [fullNetworkEvent],
      total: 1,
      isWaterfallSupported: true,
      hasNavigationRequest: true,
    },
  ],
  invalid: [
    { events: [], total: 1, isWaterfallSupported: true },
    {
      events: [{ timestamp: 'x' }],
      total: 1,
      isWaterfallSupported: true,
      hasNavigationRequest: true,
    },
  ],
});

describeCodecParity({
  label: 'SnapshotType',
  ioTs: SnapshotType,
  zod: zodSnapshot.SnapshotType,
  valid: [{ down: 1, total: 10, up: 9 }],
  invalid: [
    { down: 1, total: 10 },
    { down: '1', total: 10, up: 9 },
  ],
});

describeCodecParity({
  label: 'syntheticsCCSSettingsSchema',
  ioTs: syntheticsCCSSettingsSchema,
  zod: zodSettings.syntheticsCCSSettingsSchema,
  valid: [{ useAllRemoteClusters: false, selectedRemoteClusters: ['ccs-1'] }],
  invalid: [
    { useAllRemoteClusters: false },
    { useAllRemoteClusters: 'no', selectedRemoteClusters: [] },
  ],
});

describeCodecParity({
  label: 'syntheticsMultiSpaceSettingsSchema',
  ioTs: syntheticsMultiSpaceSettingsSchema,
  zod: zodSettings.syntheticsMultiSpaceSettingsSchema,
  valid: [{}, { useAllRemoteClusters: true, selectedRemoteClusters: ['ccs-1'] }],
  invalid: [{ useAllRemoteClusters: 'yes' }, { selectedRemoteClusters: 'ccs-1' }],
});

describeCodecParity({
  label: 'APIKeyCodec',
  ioTs: APIKeyCodec,
  zod: zodSettings.APIKeyCodec,
  valid: [{ spaces: ['default', 'team'] }],
  invalid: [{}, { spaces: 'default' }],
});

describeCodecParity({
  label: 'SyntheticsServiceApiKeyType',
  ioTs: SyntheticsServiceApiKeyType,
  zod: zodSettings.SyntheticsServiceApiKeyType,
  valid: [{ id: 'id-1', name: 'synthetics-key', apiKey: 'secret' }],
  invalid: [{ id: 'id-1', name: 'synthetics-key' }],
});

describeCodecParity({
  label: 'SyntheticsServiceApiKeySaveType',
  ioTs: SyntheticsServiceApiKeySaveType,
  zod: zodSettings.SyntheticsServiceApiKeySaveType,
  valid: [{ success: true }, { success: false, error: 'denied' }],
  invalid: [{}, { success: 'yes' }],
});

describeCodecParity({
  label: 'TLSParamsType',
  ioTs: TLSParamsType,
  zod: zodAlerts.TLSParamsType,
  valid: [{}, { search: 'elastic', certAgeThreshold: 730, certExpirationThreshold: 30 }],
  invalid: [{ certAgeThreshold: '730' }],
});

describeCodecParity({
  label: 'RangeUnitType',
  ioTs: RangeUnitType,
  zod: zodAlerts.RangeUnitType,
  valid: ['s', 'm', 'h', 'd', 'w', 'M', 'y'],
  invalid: ['hour', 'S', 1, null],
});

describeCodecParity({
  label: 'StatusCheckParamsType',
  ioTs: StatusCheckParamsType,
  zod: zodAlerts.StatusCheckParamsType,
  valid: [
    {
      locations: ['us_central'],
      numTimes: 3,
      timerange: { from: 'now-15m', to: 'now' },
      filters: 'monitor.type:http',
      shouldCheckStatus: true,
      isAutoGenerated: false,
    },
  ],
  invalid: [
    { locations: ['us_central'], numTimes: 3 },
    { locations: 'us_central', numTimes: 3, timerange: { from: 'now-15m', to: 'now' } },
  ],
});

describeCodecParity({
  label: 'AtomicStatusCheckParamsType',
  ioTs: AtomicStatusCheckParamsType,
  zod: zodAlerts.AtomicStatusCheckParamsType,
  valid: [
    {
      numTimes: 3,
      timerangeCount: 15,
      timerangeUnit: 'm',
      search: 'monitor.id:x',
      filters: statusFilters,
      shouldCheckStatus: true,
      isAutoGenerated: false,
      shouldCheckAvailability: true,
    },
  ],
  invalid: [{ numTimes: 3, timerangeCount: 15 }],
});

describeCodecParity({
  label: 'GetMonitorAvailabilityParamsType',
  ioTs: GetMonitorAvailabilityParamsType,
  zod: zodAlerts.GetMonitorAvailabilityParamsType,
  valid: [{ range: 30, rangeUnit: 'd', threshold: '99.9', filters: 'tags:prod' }],
  invalid: [
    { range: 30, rangeUnit: 'days', threshold: '99.9' },
    { range: 30, rangeUnit: 'd' },
  ],
});

describeCodecParity({
  label: 'MonitorAvailabilityType',
  ioTs: MonitorAvailabilityType,
  zod: zodAlerts.MonitorAvailabilityType,
  valid: [
    {
      availability: { range: 30, rangeUnit: 'd', threshold: '99.9' },
      shouldCheckAvailability: true,
      filters: statusFilters,
      search: 'web',
    },
  ],
  invalid: [{ availability: { range: 30, rangeUnit: 'd', threshold: '99.9' } }],
});
