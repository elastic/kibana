/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { API_VERSIONS, PND_PROPOSALS_ACTIVITY_URL } from '@kbn/pnd-common';
import type { GetProposalsActivityResponse } from '@kbn/pnd-common';

import { createPndTestProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { useProposalsActivity } from '.';

const activity: GetProposalsActivityResponse = {
  buckets: [
    { counts: { contain: 1, escalate: 0, investigate: 2, tune: 0 }, time: 1_754_524_800_000 },
    { counts: { contain: 0, escalate: 3, investigate: 0, tune: 1 }, time: 1_754_528_400_000 },
  ],
};

describe('useProposalsActivity', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(activity);
  });

  const render = ({ enabled }: { enabled?: boolean } = {}) => {
    const { Providers } = createPndTestProviders({ services: { http: { get } } });

    return renderHook(() => useProposalsActivity({ enabled }), { wrapper: Providers });
  };

  it('reads the 24h series', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual(activity));
  });

  it('requests the versioned internal activity route', async () => {
    render();

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(PND_PROPOSALS_ACTIVITY_URL, {
        version: API_VERSIONS.internal.v1,
      })
    );
  });

  it('sends no query parameters, because the series is not caller-scoped', async () => {
    render();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    expect(get.mock.calls[0][1]).not.toHaveProperty('query');
  });

  /**
   * A failed read must surface as an error rather than as a zero-filled series: a flat sparkline is
   * an affirmative claim that nothing happened for 24 hours, which is the same mistake as rendering
   * an absent risk score as a zero.
   */
  it('surfaces a refused read as an error rather than as an empty series', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('leaves the series undefined when the read is refused', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });

  it('never substitutes zeros for a failed read', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    const { result } = render();

    await waitFor(() => expect(get).toHaveBeenCalled());

    expect(result.current.data).toBeUndefined();
  });

  it('retries a 500, which may be transient', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    render();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it('does not read while disabled', () => {
    render({ enabled: false });

    expect(get).not.toHaveBeenCalled();
  });

  it('falls back to an empty series when the response carried no body', async () => {
    get.mockResolvedValue(undefined);

    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual({ buckets: [] }));
  });
});
