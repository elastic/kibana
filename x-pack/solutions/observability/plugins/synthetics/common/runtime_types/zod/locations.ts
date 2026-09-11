/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BandwidthLimitKey, LocationStatus } from '../monitor_management/locations';

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
  // io-ts types this as required `| undefined` but decode accepts a missing key.
  throttling: z.union([ThrottlingOptionsCodec, z.undefined()]).optional(),
  locations: ServiceLocationsCodec,
});
