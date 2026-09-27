/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeCodecCases } from '../test_helpers/codec_cases';
import {
  BandwidthLimitKey,
  LocationStatus,
  LocationGeoCodec,
  LocationStatusCodec,
  ManifestLocationCodec,
  MonitorServiceLocationCodec,
  PublicLocationCodec,
  ServiceLocationCodec,
  ServiceLocationErrors,
  ServiceLocationsApiResponseCodec,
  ThrottlingOptionsCodec,
} from './locations';

const geo = { lat: 41.25, lon: -95.86 };

const serviceLocation = {
  id: 'us_central',
  label: 'US Central',
  isServiceManaged: true,
  url: 'https://us-central.synthetics.elastic.dev',
  geo,
  status: LocationStatus.GA,
  isInvalid: false,
};

const privateLocation = {
  id: 'private-1',
  label: 'Private',
  isServiceManaged: false,
  geo: { lat: '52.52', lon: null },
  status: LocationStatus.BETA,
};

describeCodecCases({
  label: 'LocationStatusCodec',
  codec: LocationStatusCodec,
  valid: Object.values(LocationStatus),
  invalid: ['GA', '', null],
});

describeCodecCases({
  label: 'LocationGeoCodec',
  codec: LocationGeoCodec,
  valid: [geo, { lat: '41.25', lon: '-95.86' }, { lat: null, lon: null }],
  invalid: [{ lat: true, lon: 1 }, { lat: 1 }],
});

describeCodecCases({
  label: 'ManifestLocationCodec',
  codec: ManifestLocationCodec,
  valid: [
    {
      url: 'https://us-central.synthetics.elastic.dev',
      geo: { name: 'Iowa', location: geo },
      status: LocationStatus.GA,
    },
  ],
  invalid: [
    { url: 'https://x', geo: { name: 'Iowa' }, status: LocationStatus.GA },
    { url: 'https://x', geo: { name: 'Iowa', location: geo }, status: 'GA' },
  ],
});

describeCodecCases({
  label: 'ServiceLocationCodec',
  codec: ServiceLocationCodec,
  valid: [serviceLocation, { id: 'x', label: 'X', isServiceManaged: false }],
  invalid: [
    { label: 'X', isServiceManaged: true },
    { id: 'x', label: 'X', isServiceManaged: 'yes' },
  ],
});

describeCodecCases({
  label: 'PublicLocationCodec',
  codec: PublicLocationCodec,
  valid: [serviceLocation],
  invalid: [{ id: 'x', label: 'X', isServiceManaged: true }],
});

describeCodecCases({
  label: 'MonitorServiceLocationCodec',
  codec: MonitorServiceLocationCodec,
  valid: [
    { id: 'us_central', label: 'US Central' },
    { ...privateLocation, url: 'https://private', isServiceManaged: false, status: 'ga' },
  ],
  invalid: [{ id: 'us_central' }, { id: 1, label: 'X' }],
});

describeCodecCases({
  label: 'ServiceLocationErrors',
  codec: ServiceLocationErrors,
  valid: [
    [],
    [
      {
        locationId: 'us_central',
        error: {
          reason: 'timeout',
          status: 500,
          failed_monitors: [{ id: 'm1', message: 'failed' }],
        },
      },
      { locationId: 'us_east', error: { reason: 'down', status: 503, failed_monitors: null } },
    ],
  ],
  invalid: [[{ locationId: 'x', error: { reason: 'x' } }]],
});

describeCodecCases({
  label: 'ThrottlingOptionsCodec',
  codec: ThrottlingOptionsCodec,
  valid: [{ [BandwidthLimitKey.DOWNLOAD]: 100, [BandwidthLimitKey.UPLOAD]: 30 }],
  invalid: [{ [BandwidthLimitKey.DOWNLOAD]: 100 }, { download: '100', upload: 30 }],
});

describeCodecCases({
  label: 'ServiceLocationsApiResponseCodec',
  codec: ServiceLocationsApiResponseCodec,
  valid: [
    { locations: [] },
    { throttling: undefined, locations: [] },
    {
      throttling: { [BandwidthLimitKey.DOWNLOAD]: 100, [BandwidthLimitKey.UPLOAD]: 30 },
      locations: [serviceLocation],
    },
  ],
  invalid: [{ throttling: { download: 100 }, locations: [] }],
});
