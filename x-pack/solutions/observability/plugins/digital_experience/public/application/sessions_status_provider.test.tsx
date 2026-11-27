/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useApiClient } from '../hooks/use_api_client';
import { SessionsStatusProvider, useSessionsStatus } from './sessions_status_provider';

jest.mock('../hooks/use_api_client');

const fetch = jest.fn();

const STATUS_ENDPOINT = 'GET /internal/digital_experience/sessions/status';

const statusRequests = () => fetch.mock.calls.filter(([endpoint]) => endpoint === STATUS_ENDPOINT);

function WebPage({ enabled }: { enabled?: boolean }) {
  const { loading } = useSessionsStatus({ enabled });
  return <div data-test-subj="webPage">{String(loading)}</div>;
}

const MobilePage = () => <div data-test-subj="mobilePage" />;

beforeEach(() => {
  fetch.mockReset().mockResolvedValue({ installed: true, rebuilding: false });
  jest
    .mocked(useApiClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof useApiClient>);
});

describe('SessionsStatusProvider', () => {
  it('requests no status for pages that never ask for it, e.g. mobile ones', async () => {
    render(
      <SessionsStatusProvider>
        <MobilePage />
      </SessionsStatusProvider>
    );

    await waitFor(() => expect(statusRequests()).toHaveLength(0));
  });

  it('requests the status once a page asks for it', async () => {
    render(
      <SessionsStatusProvider>
        <WebPage />
      </SessionsStatusProvider>
    );

    await waitFor(() => expect(statusRequests()).toHaveLength(1));
  });

  it('requests none for a page that turns it off, e.g. the Mobile tab of the list', async () => {
    const { getByTestId } = render(
      <SessionsStatusProvider>
        <WebPage enabled={false} />
      </SessionsStatusProvider>
    );

    await waitFor(() => expect(getByTestId('webPage')).toHaveTextContent('false'));
    expect(statusRequests()).toHaveLength(0);
  });
});
