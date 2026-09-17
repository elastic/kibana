/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compile-time check that each leaf twin's `z.output` is mutually assignable
 * to `t.TypeOf` of the io-ts original (after dropping `z.looseObject`'s
 * catchall index signature).
 *
 * `ServiceLocationsApiResponseCodec` is omitted: io-ts types `throttling` as
 * required `| undefined` while decode (and the twin) accept a missing key.
 */
import type { z } from '@kbn/zod';
import type * as t from 'io-ts';
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

type Pair<I extends t.Mixed, Z extends z.ZodType> = MutuallyAssignable<
  t.TypeOf<I>,
  KnownKeys<z.output<Z>>
>;

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
}

export type LeafTypeParity = ExpectAllTrue<Parity>;
