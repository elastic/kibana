/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import type {
  BandwidthLimitKeyCodec,
  LocationStatusCodec,
  LocationsCodec,
  ManifestLocationCodec,
  MonitorServiceLocationCodec,
  PublicLocationCodec,
  PublicLocationsCodec,
  ServiceLocationCodec,
  ServiceLocationErrors as ServiceLocationErrorsCodec,
  ServiceLocationsApiResponseCodec,
  ServiceLocationsCodec,
  ThrottlingOptionsCodec,
} from '../schemas/locations';

export enum LocationStatus {
  GA = 'ga',
  BETA = 'beta',
  EXPERIMENTAL = 'experimental',
}

export enum BandwidthLimitKey {
  DOWNLOAD = 'download',
  UPLOAD = 'upload',
}

export const DEFAULT_BANDWIDTH_LIMIT = {
  [BandwidthLimitKey.DOWNLOAD]: 100,
  [BandwidthLimitKey.UPLOAD]: 30,
};

export const DEFAULT_THROTTLING = {
  [BandwidthLimitKey.DOWNLOAD]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.DOWNLOAD],
  [BandwidthLimitKey.UPLOAD]: DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.UPLOAD],
};

export type BandwidthLimitKeyType = SchemaOutput<typeof BandwidthLimitKeyCodec>;
export type LocationStatusType = SchemaOutput<typeof LocationStatusCodec>;
export type ManifestLocation = SchemaOutput<typeof ManifestLocationCodec>;
export type ServiceLocation = SchemaOutput<typeof ServiceLocationCodec>;
export type ServiceLocations = SchemaOutput<typeof ServiceLocationsCodec>;
export type MonitorServiceLocation = SchemaOutput<typeof MonitorServiceLocationCodec>;
export type ServiceLocationErrors = SchemaOutput<typeof ServiceLocationErrorsCodec>;
export type ThrottlingOptions = SchemaOutput<typeof ThrottlingOptionsCodec>;
export type Locations = SchemaOutput<typeof LocationsCodec>;
export type PublicLocation = SchemaOutput<typeof PublicLocationCodec>;
export type PublicLocations = SchemaOutput<typeof PublicLocationsCodec>;
export type ServiceLocationsApiResponse = SchemaOutput<typeof ServiceLocationsApiResponseCodec>;

export interface ServiceLocationErrorsResponse {
  attributes: { message: string; errors: ServiceLocationErrors; id?: string };
}
