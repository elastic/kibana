/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../schema_output';

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

export const BandwidthLimitKeyCodec = z.enum(BandwidthLimitKey);
export const LocationStatusCodec = z.enum(LocationStatus);

export const LocationGeoCodec = z.looseObject({
  lat: z.union([z.string(), z.number(), z.null()]),
  lon: z.union([z.string(), z.number(), z.null()]),
});

export const ManifestLocationCodec = z.looseObject({
  url: z.string(),
  geo: z.looseObject({
    name: z.string(),
    location: LocationGeoCodec,
  }),
  status: LocationStatusCodec,
});

export const ServiceLocationCodec = z.looseObject({
  id: z.string(),
  label: z.string(),
  isServiceManaged: z.boolean(),
  url: z.string().optional(),
  geo: LocationGeoCodec.optional(),
  status: LocationStatusCodec.optional(),
  isInvalid: z.boolean().optional(),
});

export const PublicLocationCodec = z.looseObject({
  id: z.string(),
  label: z.string(),
  isServiceManaged: z.boolean(),
  url: z.string(),
  geo: LocationGeoCodec.optional(),
  status: LocationStatusCodec.optional(),
  isInvalid: z.boolean().optional(),
});

export const PublicLocationsCodec = z.array(PublicLocationCodec);

export const MonitorServiceLocationCodec = z.looseObject({
  id: z.string(),
  label: z.string(),
  geo: LocationGeoCodec.optional(),
  url: z.string().optional(),
  isServiceManaged: z.boolean().optional(),
  status: z.string().optional(),
});

export const ServiceLocationErrors = z.array(
  z.looseObject({
    locationId: z.string(),
    error: z.looseObject({
      reason: z.string(),
      status: z.number(),
      failed_monitors: z
        .union([
          z.array(
            z.looseObject({
              id: z.string(),
              message: z.string(),
            })
          ),
          z.null(),
        ])
        .optional(),
    }),
  })
);

export const ServiceLocationsCodec = z.array(ServiceLocationCodec);
export const MonitorServiceLocationsCodec = z.array(MonitorServiceLocationCodec);

export const LocationCodec = ServiceLocationCodec;

export const LocationsCodec = z.array(LocationCodec);

export const ThrottlingOptionsCodec = z.looseObject({
  [BandwidthLimitKey.DOWNLOAD]: z.number(),
  [BandwidthLimitKey.UPLOAD]: z.number(),
});

export const ServiceLocationsApiResponseCodec = z.looseObject({
  // A missing `throttling` key decodes successfully, so the field stays optional.
  throttling: z.union([ThrottlingOptionsCodec, z.undefined()]).optional(),
  locations: ServiceLocationsCodec,
});

export type BandwidthLimitKeyType = SchemaOutput<typeof BandwidthLimitKeyCodec>;
export type LocationStatusType = SchemaOutput<typeof LocationStatusCodec>;
export type ManifestLocation = SchemaOutput<typeof ManifestLocationCodec>;
export type ServiceLocation = SchemaOutput<typeof ServiceLocationCodec>;
export type ServiceLocations = SchemaOutput<typeof ServiceLocationsCodec>;
export type MonitorServiceLocation = SchemaOutput<typeof MonitorServiceLocationCodec>;
export type ServiceLocationErrors = SchemaOutput<typeof ServiceLocationErrors>;
export type ThrottlingOptions = SchemaOutput<typeof ThrottlingOptionsCodec>;
export type Locations = SchemaOutput<typeof LocationsCodec>;
export type PublicLocation = SchemaOutput<typeof PublicLocationCodec>;
export type PublicLocations = SchemaOutput<typeof PublicLocationsCodec>;
export type ServiceLocationsApiResponse = SchemaOutput<typeof ServiceLocationsApiResponseCodec>;

export interface ServiceLocationErrorsResponse {
  attributes: { message: string; errors: ServiceLocationErrors; id?: string };
}
