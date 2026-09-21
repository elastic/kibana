/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import rison from '@kbn/rison';
import { useAlertsUrl } from './alert_actions';

jest.mock('../../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '/s/default' }),
}));

const decodeAppState = (url: string) => {
  const encoded = url.split('_a=')[1];
  return rison.decode(decodeURIComponent(encoded)) as {
    kuery: string;
    status?: string;
  };
};

describe('useAlertsUrl', () => {
  const range = { rangeFrom: 'now-12h', rangeTo: 'now' };

  it('scopes to monitor status alerts by default', () => {
    const { result } = renderHook(() => useAlertsUrl(range));

    const { kuery } = decodeAppState(result.current);
    expect(kuery).toContain('Synthetics monitor status');
    expect(kuery).not.toContain('Synthetics TLS certificate');
  });

  it('includes TLS alerts when includeTls is set', () => {
    const { result } = renderHook(() => useAlertsUrl({ ...range, includeTls: true }));

    const { kuery } = decodeAppState(result.current);
    expect(kuery).toContain('Synthetics monitor status');
    expect(kuery).toContain('Synthetics TLS certificate');
  });

  it('ANDs extra overview filters onto the destination kuery', () => {
    const { result } = renderHook(() =>
      useAlertsUrl({
        ...range,
        includeTls: true,
        extraKuery:
          'kibana.space_ids: "default" and kibana.alert.status: ("active" or "recovered")',
        status: 'all',
      })
    );

    const { kuery, status } = decodeAppState(result.current);
    expect(kuery).toContain('Synthetics TLS certificate');
    expect(kuery).toContain('kibana.space_ids: "default"');
    expect(kuery).toContain('kibana.alert.status: ("active" or "recovered")');
    expect(status).toBe('all');
  });
});
