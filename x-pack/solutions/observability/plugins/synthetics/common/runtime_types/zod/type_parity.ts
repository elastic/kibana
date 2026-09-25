/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compile-time check that each twin's `z.output` is mutually assignable to
 * `t.TypeOf` of the io-ts original (after dropping `z.looseObject`'s catchall
 * index signature). Covers Phase 1 leaf codecs, Phase 2 monitor field codecs,
 * and Phase 3 decode-site twins.
 *
 * `ServiceLocationsApiResponseCodec` is omitted: io-ts types `throttling` as
 * required `| undefined` while decode (and the twin) accept a missing key.
 * `ProjectMonitorCodec` (and the request wrappers that nest it) is omitted:
 * io-ts types `schedule` as `string | number` while decode (and the twin) only
 * accept `number | '10s' | '30s'`.
 * `PrivateLocationAttributesCodec` is omitted: the io-ts original was replaced
 * by the zod twin (server re-exports it).
 */
import type { z } from '@kbn/zod';
import type { ExpectAllTrue, KnownKeys, MutuallyAssignable } from '../test_helpers/type_equality';
import type {
  CheckGeoType,
  DateRangeType,
  LocationType,
  StatesIndexStatusType,
  SummaryType,
} from '../common';
import type { CertFacetsType, CertResultType, CertType, GetCertsParamsType } from '../certs';
import type { DynamicSettingsCodec, LocationMonitorsType } from '../dynamic_settings';
import type { SyntheticsNetworkEventsApiResponseType } from '../network_events';
import type { SnapshotType } from '../snapshot';
import type { syntheticsCCSSettingsSchema } from '../ccs_settings';
import type { syntheticsMultiSpaceSettingsSchema } from '../multi_space_settings';
import type { APIKeyCodec } from '../settings/api_key';
import type {
  SyntheticsServiceApiKeySaveType,
  SyntheticsServiceApiKeyType,
} from '../synthetics_service_api_key';
import type { remoteMonitorInfoSchema } from '../remote';
import type { TLSParamsType } from '../alerts/tls';
import type {
  AtomicStatusCheckParamsType,
  GetMonitorAvailabilityParamsType,
  MonitorAvailabilityType,
  RangeUnitType,
  StatusCheckParamsType,
} from '../alerts/status_check';
import type {
  LocationStatusCodec,
  MonitorServiceLocationCodec,
  PublicLocationCodec,
  ServiceLocationCodec,
} from '../monitor_management/locations';
import type { PingType, PingsResponseType } from '../ping/ping';
import type { ErrorGroupsResponseType } from '../ping/error_groups';
import type { ErrorStatsType } from '../ping/error_stats';
import type {
  JourneyStepType,
  RefResultType,
  SyntheticsJourneyApiResponseType,
} from '../ping/synthetics';
import type * as zodCommon from './common';
import type * as zodCerts from './certs';
import type * as zodDynamic from './dynamic_settings';
import type * as zodNetwork from './network_events';
import type * as zodSnapshot from './snapshot';
import type * as zodSettings from './settings';
import type * as zodRemote from './remote';
import type * as zodAlerts from './alerts';
import type * as zodLocations from './locations';
import type * as zodPing from './ping';
import type {
  APIFieldsCodec,
  BrowserFieldsCodec,
  CommonFieldsCodec,
  EncryptedAPIFieldsCodec,
  EncryptedBrowserFieldsCodec,
  EncryptedHTTPFieldsCodec,
  EncryptedSyntheticsMonitorCodec,
  EncryptedSyntheticsSavedMonitorCodec,
  EncryptedTCPFieldsCodec,
  HeartbeatConfigCodec,
  HTTPFieldsCodec,
  ICMPFieldsCodec,
  ICMPSimpleFieldsCodec,
  SyntheticsMonitorCodec,
  SyntheticsMonitorWithIdCodec,
  TCPFieldsCodec,
  TLSCodec,
  TLSFieldsCodec,
} from '../monitor_management/monitor_types';
import type * as zodMonitor from './monitor_types';
import type {
  ProjectMonitorMetaDataCodec,
  ProjectMonitorThrottlingConfigCodec,
  ProjectMonitorsResponseCodec,
} from '../monitor_management/monitor_types_project';
import type * as zodProject from './monitor_types_project';
import type {
  SyntheticsCommonStateCodec,
  SyntheticsMonitorStatusAlertStateCodec,
} from '../alert_rules/common';
import type * as zodAlertRules from './alert_rules_common';
import type { MonitorOriginCodec } from '../heartbeat_monitor';
import type * as zodHeartbeat from './heartbeat_monitor';
import type { MonitorManagementEnablementResultCodec } from '../monitor_management/state';
import type * as zodState from './state';
import type {
  OverviewPingCodec,
  OverviewStalePriorRunCodec,
  OverviewStaleStatusCodec,
  OverviewStatusCodec,
  OverviewStatusMetaDataCodec,
  PaginatedOverviewStatusCodec,
} from '../monitor_management/synthetics_overview_status';
import type * as zodOverview from './synthetics_overview_status';
import type {
  DeleteParamsResponseCodec,
  SyntheticsParamRequestCodec,
  SyntheticsParamsCodec,
  SyntheticsParamsReadonlyCodec,
} from '../monitor_management/synthetics_params';
import type * as zodParams from './synthetics_params';

// io-ts codecs carry `_A`/`_O`/`_I`. Re-exported codecs are zod and do not.
type OutputOf<T> = T extends { readonly _A: infer A; readonly _O: unknown; readonly _I: unknown }
  ? A
  : T extends z.ZodType
  ? KnownKeys<z.output<T>>
  : never;

type Pair<I, Z extends z.ZodType> = MutuallyAssignable<OutputOf<I>, KnownKeys<z.output<Z>>>;

interface Parity {
  Location: Pair<typeof LocationType, typeof zodCommon.LocationType>;
  CheckGeo: Pair<typeof CheckGeoType, typeof zodCommon.CheckGeoType>;
  Summary: Pair<typeof SummaryType, typeof zodCommon.SummaryType>;
  StatesIndexStatus: Pair<typeof StatesIndexStatusType, typeof zodCommon.StatesIndexStatusType>;
  DateRange: Pair<typeof DateRangeType, typeof zodCommon.DateRangeType>;
  Remote: Pair<typeof remoteMonitorInfoSchema, typeof zodRemote.remoteMonitorInfoSchema>;
  GetCertsParams: Pair<typeof GetCertsParamsType, typeof zodCerts.GetCertsParamsType>;
  Cert: Pair<typeof CertType, typeof zodCerts.CertType>;
  CertResult: Pair<typeof CertResultType, typeof zodCerts.CertResultType>;
  CertFacets: Pair<typeof CertFacetsType, typeof zodCerts.CertFacetsType>;
  DynamicSettings: Pair<typeof DynamicSettingsCodec, typeof zodDynamic.DynamicSettingsCodec>;
  LocationMonitors: Pair<typeof LocationMonitorsType, typeof zodDynamic.LocationMonitorsType>;
  NetworkEvents: Pair<
    typeof SyntheticsNetworkEventsApiResponseType,
    typeof zodNetwork.SyntheticsNetworkEventsApiResponseType
  >;
  Snapshot: Pair<typeof SnapshotType, typeof zodSnapshot.SnapshotType>;
  CCS: Pair<typeof syntheticsCCSSettingsSchema, typeof zodSettings.syntheticsCCSSettingsSchema>;
  MultiSpace: Pair<
    typeof syntheticsMultiSpaceSettingsSchema,
    typeof zodSettings.syntheticsMultiSpaceSettingsSchema
  >;
  APIKey: Pair<typeof APIKeyCodec, typeof zodSettings.APIKeyCodec>;
  ServiceApiKey: Pair<
    typeof SyntheticsServiceApiKeyType,
    typeof zodSettings.SyntheticsServiceApiKeyType
  >;
  ServiceApiKeySave: Pair<
    typeof SyntheticsServiceApiKeySaveType,
    typeof zodSettings.SyntheticsServiceApiKeySaveType
  >;
  TLSParams: Pair<typeof TLSParamsType, typeof zodAlerts.TLSParamsType>;
  AtomicStatus: Pair<
    typeof AtomicStatusCheckParamsType,
    typeof zodAlerts.AtomicStatusCheckParamsType
  >;
  StatusCheck: Pair<typeof StatusCheckParamsType, typeof zodAlerts.StatusCheckParamsType>;
  RangeUnit: Pair<typeof RangeUnitType, typeof zodAlerts.RangeUnitType>;
  Availability: Pair<
    typeof GetMonitorAvailabilityParamsType,
    typeof zodAlerts.GetMonitorAvailabilityParamsType
  >;
  MonitorAvailability: Pair<
    typeof MonitorAvailabilityType,
    typeof zodAlerts.MonitorAvailabilityType
  >;
  LocationStatus: Pair<typeof LocationStatusCodec, typeof zodLocations.LocationStatusCodec>;
  ServiceLocation: Pair<typeof ServiceLocationCodec, typeof zodLocations.ServiceLocationCodec>;
  PublicLocation: Pair<typeof PublicLocationCodec, typeof zodLocations.PublicLocationCodec>;
  MonitorServiceLocation: Pair<
    typeof MonitorServiceLocationCodec,
    typeof zodLocations.MonitorServiceLocationCodec
  >;
  Ping: Pair<typeof PingType, typeof zodPing.PingType>;
  PingsResponse: Pair<typeof PingsResponseType, typeof zodPing.PingsResponseType>;
  JourneyStep: Pair<typeof JourneyStepType, typeof zodPing.JourneyStepType>;
  RefResult: Pair<typeof RefResultType, typeof zodPing.RefResultType>;
  JourneyApi: Pair<
    typeof SyntheticsJourneyApiResponseType,
    typeof zodPing.SyntheticsJourneyApiResponseType
  >;
  ErrorGroups: Pair<typeof ErrorGroupsResponseType, typeof zodPing.ErrorGroupsResponseType>;
  ErrorStats: Pair<typeof ErrorStatsType, typeof zodPing.ErrorStatsType>;
  TLSFields: Pair<typeof TLSFieldsCodec, typeof zodMonitor.TLSFieldsCodec>;
  TLS: Pair<typeof TLSCodec, typeof zodMonitor.TLSCodec>;
  CommonFields: Pair<typeof CommonFieldsCodec, typeof zodMonitor.CommonFieldsCodec>;
  TCPFields: Pair<typeof TCPFieldsCodec, typeof zodMonitor.TCPFieldsCodec>;
  EncryptedTCPFields: Pair<
    typeof EncryptedTCPFieldsCodec,
    typeof zodMonitor.EncryptedTCPFieldsCodec
  >;
  ICMPSimpleFields: Pair<typeof ICMPSimpleFieldsCodec, typeof zodMonitor.ICMPSimpleFieldsCodec>;
  ICMPFields: Pair<typeof ICMPFieldsCodec, typeof zodMonitor.ICMPFieldsCodec>;
  HTTPFields: Pair<typeof HTTPFieldsCodec, typeof zodMonitor.HTTPFieldsCodec>;
  EncryptedHTTPFields: Pair<
    typeof EncryptedHTTPFieldsCodec,
    typeof zodMonitor.EncryptedHTTPFieldsCodec
  >;
  BrowserFields: Pair<typeof BrowserFieldsCodec, typeof zodMonitor.BrowserFieldsCodec>;
  EncryptedBrowserFields: Pair<
    typeof EncryptedBrowserFieldsCodec,
    typeof zodMonitor.EncryptedBrowserFieldsCodec
  >;
  APIFields: Pair<typeof APIFieldsCodec, typeof zodMonitor.APIFieldsCodec>;
  EncryptedAPIFields: Pair<
    typeof EncryptedAPIFieldsCodec,
    typeof zodMonitor.EncryptedAPIFieldsCodec
  >;
  // MonitorFieldsCodec is a mega-intersection of every type's fields; io-ts and
  // the flat zod twin drift on a few optional/required merges — covered by the
  // characterization corpus instead of compile-time Pair.
  SyntheticsMonitor: Pair<typeof SyntheticsMonitorCodec, typeof zodMonitor.SyntheticsMonitorCodec>;
  EncryptedSyntheticsMonitor: Pair<
    typeof EncryptedSyntheticsMonitorCodec,
    typeof zodMonitor.EncryptedSyntheticsMonitorCodec
  >;
  SyntheticsMonitorWithId: Pair<
    typeof SyntheticsMonitorWithIdCodec,
    typeof zodMonitor.SyntheticsMonitorWithIdCodec
  >;
  HeartbeatConfig: Pair<typeof HeartbeatConfigCodec, typeof zodMonitor.HeartbeatConfigCodec>;
  EncryptedSyntheticsSavedMonitor: Pair<
    typeof EncryptedSyntheticsSavedMonitorCodec,
    typeof zodMonitor.EncryptedSyntheticsSavedMonitorCodec
  >;
  ProjectMonitorThrottling: Pair<
    typeof ProjectMonitorThrottlingConfigCodec,
    typeof zodProject.ProjectMonitorThrottlingConfigCodec
  >;
  ProjectMonitorMetaData: Pair<
    typeof ProjectMonitorMetaDataCodec,
    typeof zodProject.ProjectMonitorMetaDataCodec
  >;
  ProjectMonitorsResponse: Pair<
    typeof ProjectMonitorsResponseCodec,
    typeof zodProject.ProjectMonitorsResponseCodec
  >;
  SyntheticsCommonState: Pair<
    typeof SyntheticsCommonStateCodec,
    typeof zodAlertRules.SyntheticsCommonStateCodec
  >;
  SyntheticsMonitorStatusAlertState: Pair<
    typeof SyntheticsMonitorStatusAlertStateCodec,
    typeof zodAlertRules.SyntheticsMonitorStatusAlertStateCodec
  >;
  MonitorOrigin: Pair<typeof MonitorOriginCodec, typeof zodHeartbeat.MonitorOriginCodec>;
  Enablement: Pair<
    typeof MonitorManagementEnablementResultCodec,
    typeof zodState.MonitorManagementEnablementResultCodec
  >;
  OverviewPing: Pair<typeof OverviewPingCodec, typeof zodOverview.OverviewPingCodec>;
  OverviewStatusMetaData: Pair<
    typeof OverviewStatusMetaDataCodec,
    typeof zodOverview.OverviewStatusMetaDataCodec
  >;
  OverviewStatus: Pair<typeof OverviewStatusCodec, typeof zodOverview.OverviewStatusCodec>;
  PaginatedOverviewStatus: Pair<
    typeof PaginatedOverviewStatusCodec,
    typeof zodOverview.PaginatedOverviewStatusCodec
  >;
  OverviewStalePriorRun: Pair<
    typeof OverviewStalePriorRunCodec,
    typeof zodOverview.OverviewStalePriorRunCodec
  >;
  OverviewStaleStatus: Pair<
    typeof OverviewStaleStatusCodec,
    typeof zodOverview.OverviewStaleStatusCodec
  >;
  ParamsReadonly: Pair<
    typeof SyntheticsParamsReadonlyCodec,
    typeof zodParams.SyntheticsParamsReadonlyCodec
  >;
  Params: Pair<typeof SyntheticsParamsCodec, typeof zodParams.SyntheticsParamsCodec>;
  DeleteParams: Pair<typeof DeleteParamsResponseCodec, typeof zodParams.DeleteParamsResponseCodec>;
  ParamRequest: Pair<
    typeof SyntheticsParamRequestCodec,
    typeof zodParams.SyntheticsParamRequestCodec
  >;
}

export type LeafTypeParity = ExpectAllTrue<Parity>;
