/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import {
  API_VERSIONS,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_DISCOVERY_CONTEXT_URL,
} from '@kbn/pnd-common';
import type { GetDiscoveryContextResponse } from '@kbn/pnd-common';

import { createPndTestProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { useDiscoveryContext } from '.';

const discoveryContext: GetDiscoveryContextResponse = {
  contexts: [
    {
      correlationId: 'ad-1',
      entities: [{ count: 3, field: 'host.name', value: 'web-1' }],
      riskScore: 73,
    },
  ],
};

describe('useDiscoveryContext', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(discoveryContext);
  });

  const render = ({
    correlationIds = ['ad-1'],
    enabled,
  }: { correlationIds?: string[]; enabled?: boolean } = {}) => {
    const { Providers } = createPndTestProviders({ services: { http: { get } } });

    return renderHook(() => useDiscoveryContext({ correlationIds, enabled }), {
      wrapper: Providers,
    });
  };

  it('reads the blast radius and risk score of the discoveries on screen', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual(discoveryContext));
  });

  it('requests the versioned internal discovery-context route', async () => {
    render();

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(PND_DISCOVERY_CONTEXT_URL, {
        query: { correlationIds: ['ad-1'] },
        version: API_VERSIONS.internal.v1,
      })
    );
  });

  /** Several proposals of one discovery are one enrichment, not one query parameter each. */
  it('asks for a repeated discovery once', async () => {
    render({ correlationIds: ['ad-1', 'ad-1'] });

    await waitFor(() => expect(get.mock.calls[0][1].query).toEqual({ correlationIds: ['ad-1'] }));
  });

  /** An uncorrelated proposal carries `''`, which has no constituent alerts to aggregate. */
  it('leaves the empty id of an uncorrelated proposal out of the request', async () => {
    render({ correlationIds: ['', 'ad-1'] });

    await waitFor(() => expect(get.mock.calls[0][1].query).toEqual({ correlationIds: ['ad-1'] }));
  });

  /** The route answers 400 above its cap, so a wide queue must not take the blast radius down. */
  it('caps the ids at what the route accepts', async () => {
    const tooMany = new Array(PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS + 5)
      .fill(null)
      .map((_, index) => `ad-${index}`);

    render({ correlationIds: tooMany });

    await waitFor(() =>
      expect(get.mock.calls[0][1].query.correlationIds).toHaveLength(
        PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS
      )
    );
  });

  it('does not read when every proposal on screen is uncorrelated', () => {
    render({ correlationIds: ['', ''] });

    expect(get).not.toHaveBeenCalled();
  });

  it('does not read when there are no proposals on screen', () => {
    render({ correlationIds: [] });

    expect(get).not.toHaveBeenCalled();
  });

  it('does not read while disabled', () => {
    render({ enabled: false });

    expect(get).not.toHaveBeenCalled();
  });

  it('falls back to no contexts when the response carried no body', async () => {
    get.mockResolvedValue(undefined);

    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual({ contexts: [] }));
  });

  /**
   * The route always answers 200, degrading to `{ contexts: [] }` on a failed aggregation, so a
   * rejection here is a transport or authorization failure. The queue reads from its own key and is
   * untouched either way: the chips simply do not appear.
   */
  it('leaves the blast radius absent when the read is refused', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });

  it('retries a 500, which may be transient', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    render();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
