/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import { BandwidthLimitKey, LocationStatus } from '../monitor_management/locations';
import type { MonitorServiceLocation } from '../monitor_management/locations';

export const BandwidthLimitKeyCodec = lazySchema(() => z.enum(BandwidthLimitKey));
export const LocationStatusCodec = lazySchema(() => z.enum(LocationStatus));

export const LocationGeoCodec = lazySchema(() =>
  z.looseObject({
    lat: z.union([z.string(), z.number(), z.null()]),
    lon: z.union([z.string(), z.number(), z.null()]),
  })
);

export const ManifestLocationCodec = lazySchema(() =>
  z.looseObject({
    url: z.string(),
    geo: z.looseObject({
      name: z.string(),
      location: LocationGeoCodec,
    }),
    status: LocationStatusCodec,
  })
);

export const ServiceLocationCodec = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    label: z.string(),
    isServiceManaged: z.boolean(),
    url: z.string().optional(),
    geo: LocationGeoCodec.optional(),
    status: LocationStatusCodec.optional(),
    isInvalid: z.boolean().optional(),
  })
);

export const PublicLocationCodec = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    label: z.string(),
    isServiceManaged: z.boolean(),
    url: z.string(),
    geo: LocationGeoCodec.optional(),
    status: LocationStatusCodec.optional(),
    isInvalid: z.boolean().optional(),
  })
);

export const PublicLocationsCodec = lazySchema(() => z.array(PublicLocationCodec));

export const MonitorServiceLocationCodec = lazySchema(() =>
  z.looseObject({
    id: z.string(),
    label: z.string(),
    geo: LocationGeoCodec.optional(),
    url: z.string().optional(),
    isServiceManaged: z.boolean().optional(),
    status: z.string().optional(),
  })
);

export const ServiceLocationErrors = lazySchema(() =>
  z.array(
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
  )
);

export const ServiceLocationsCodec = lazySchema(() => z.array(ServiceLocationCodec));
export const MonitorServiceLocationsCodec = lazySchema(() => z.array(MonitorServiceLocationCodec));

export const LocationCodec = ServiceLocationCodec;

export const LocationsCodec = lazySchema(() => z.array(LocationCodec));

export const ThrottlingOptionsCodec = lazySchema(() =>
  z.looseObject({
    [BandwidthLimitKey.DOWNLOAD]: z.number(),
    [BandwidthLimitKey.UPLOAD]: z.number(),
  })
);

export const ServiceLocationsApiResponseCodec = lazySchema(() =>
  z.looseObject({
    // A missing `throttling` key decodes successfully, so the field stays optional.
    throttling: z.union([ThrottlingOptionsCodec, z.undefined()]).optional(),
    locations: ServiceLocationsCodec,
  })
);

/** True when `location` fails the zod `MonitorServiceLocationCodec`. */
export const isServiceLocationInvalid = (location: MonitorServiceLocation) =>
  !MonitorServiceLocationCodec.safeParse(location).success;
