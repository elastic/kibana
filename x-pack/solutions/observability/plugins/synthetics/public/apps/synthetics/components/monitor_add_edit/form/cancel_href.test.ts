/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAddMonitorCancelHref } from './cancel_href';

const getUrlForApp = (appId: string, { path }: { path: string }) => `/app/${appId}${path}`;
const monitorsHref = '/app/synthetics/monitors';

describe('getAddMonitorCancelHref', () => {
  it('returns the caller url when both return params are present', () => {
    expect(
      getAddMonitorCancelHref({
        search: '?returnAppId=observabilityOnboarding&returnPath=%3F',
        monitorsHref,
        getUrlForApp,
      })
    ).toBe('/app/observabilityOnboarding?');
  });

  it('keeps the monitors href when params are missing', () => {
    expect(
      getAddMonitorCancelHref({
        search: '',
        monitorsHref,
        getUrlForApp,
      })
    ).toBe(monitorsHref);
  });

  it('keeps the monitors href when only one param is present', () => {
    expect(
      getAddMonitorCancelHref({
        search: '?returnAppId=observabilityOnboarding',
        monitorsHref,
        getUrlForApp,
      })
    ).toBe(monitorsHref);
  });
});
