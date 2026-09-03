/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { API_VERSIONS } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../common/constants';
import { createPndTestProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import { usePndExecution } from '.';

const execution = {
  correlationId: 'ad-1',
  steps: [{ phaseStepId: 'step-1-1', status: 'completed' as const }],
};

const REQUEST_OPTIONS = { asResponse: true, version: API_VERSIONS.internal.v1 };

describe('usePndExecution', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(
      createHttpResponse({
        body: execution,
        headers: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
      })
    );
  });

  const render = (correlationId: string | undefined) => {
    const { Providers } = createPndTestProviders({ services: { http: { get } } });

    return renderHook(() => usePndExecution(correlationId), { wrapper: Providers });
  };

  it('reads the four-phase projection for the discovery', async () => {
    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.data?.execution).toEqual(execution));
  });

  it('requests the versioned internal execution route', async () => {
    render('ad-1');

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/internal/pnd/executions/ad-1', REQUEST_OPTIONS)
    );
  });

  it('encodes the discovery id, which is user-supplied and appears in the path', async () => {
    render('ad 1/2');

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/internal/pnd/executions/ad%201%2F2', REQUEST_OPTIONS)
    );
  });

  it('reads the correlation signal header, because the 14-row body cannot carry it', async () => {
    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.data?.isCorrelated).toBe(true));
  });

  it('reads `false` as "no run correlated to this discovery"', async () => {
    get.mockResolvedValue(
      createHttpResponse({
        body: execution,
        headers: { [PND_EXECUTION_CORRELATED_HEADER]: 'false' },
      })
    );

    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.data?.isCorrelated).toBe(false));
  });

  it('leaves the correlation signal undefined when the server did not stamp it', async () => {
    get.mockResolvedValue(createHttpResponse({ body: execution }));

    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.data?.execution).toEqual(execution));
    expect(result.current.data?.isCorrelated).toBeUndefined();
  });

  it('falls back to an empty skeleton when the response carried no body', async () => {
    get.mockResolvedValue(createHttpResponse<typeof execution>({}));

    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.data?.execution.steps).toEqual([]));
  });

  it('echoes the requested discovery id when the response carried no body', async () => {
    get.mockResolvedValue(createHttpResponse<typeof execution>({}));

    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.data?.execution.correlationId).toBe('ad-1'));
  });

  it('does not read anything without a discovery id', () => {
    render(undefined);

    expect(get).not.toHaveBeenCalled();
  });

  it('stays idle without a discovery id', () => {
    const { result } = render(undefined);

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces a 404 without retrying it, because an unreadable discovery stays unreadable', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 404 }));

    const { result } = render('ad-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('reads only once for a 404', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 404 }));

    const { result } = render('ad-1');
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(get).toHaveBeenCalledTimes(1);
  });
});
