/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSyntheticsCertificatesRoute,
  getSyntheticsErrorRouteFromMonitorId,
} from './get_synthetics_monitor_url';

describe('getSyntheticsErrorRouteFromMonitorId', () => {
  it('builds a monitor error route with location id', () => {
    expect(
      getSyntheticsErrorRouteFromMonitorId({
        configId: 'config-1',
        stateId: 'state-1',
        locationId: 'us-east',
      })
    ).toBe('/app/synthetics/monitor/config-1/errors/state-1?locationId=us-east');
  });
});

describe('getSyntheticsCertificatesRoute', () => {
  it('returns the certificates page when no filters are provided', () => {
    expect(getSyntheticsCertificatesRoute({})).toBe('/app/synthetics/certificates');
  });

  it('pre-filters the certificates page by common name and issuer', () => {
    expect(
      getSyntheticsCertificatesRoute({
        commonName: 'example.com',
        issuer: 'Test CA',
      })
    ).toBe('/app/synthetics/certificates?search=example.com&issuers=%5B%22Test%20CA%22%5D');
  });
});
