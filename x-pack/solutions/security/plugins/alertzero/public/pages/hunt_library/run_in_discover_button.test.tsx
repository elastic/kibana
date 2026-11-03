/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLaunchHunt } from '../../hooks/use_launch_hunt';
import { RunInDiscoverButton } from './run_in_discover_button';
import { makeDetail, unavailable } from './test_fixtures';

jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));
jest.mock('../../hooks/use_launch_hunt');

const getRedirectUrl = jest.fn().mockReturnValue('/app/discover#/?esql');
const navigateToUrl = jest.fn().mockResolvedValue(undefined);
const addDanger = jest.fn();
const reportEvent = jest.fn();

const setup = ({ share = true }: { share?: boolean } = {}) => {
  jest.mocked(useKibana).mockReturnValue({
    services: {
      share: share
        ? {
            url: {
              locators: {
                get: (id: string) =>
                  id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl } : undefined,
              },
            },
          }
        : undefined,
      analytics: { reportEvent },
      application: { navigateToUrl },
      notifications: { toasts: { addDanger } },
    },
  } as never);
};

const mockMutation = (mutateAsync: jest.Mock) =>
  jest.mocked(useLaunchHunt).mockReturnValue({ mutateAsync, isLoading: false } as never);

describe('RunInDiscoverButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('records the session, then opens the hunt query in Discover with its default time range', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    mockMutation(mutateAsync);
    const hunt = makeDetail();
    render(<RunInDiscoverButton hunt={hunt} />);

    fireEvent.click(screen.getByTestId('alertZeroHuntRunInDiscover'));

    await waitFor(() => expect(navigateToUrl).toHaveBeenCalledWith('/app/discover#/?esql'));
    expect(mutateAsync).toHaveBeenCalledWith({
      huntId: hunt.id,
      sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(getRedirectUrl).toHaveBeenCalledWith({
      query: { esql: hunt.query.query },
      timeRange: hunt.query.defaultTimeRange,
    });
    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith('alertzero_ui_hunt_launched', { hunt_id: hunt.id });
  });

  it('does not open Discover when recording the session fails, and says so', async () => {
    mockMutation(jest.fn().mockRejectedValue(new Error('boom')));
    render(<RunInDiscoverButton hunt={makeDetail()} />);

    fireEvent.click(screen.getByTestId('alertZeroHuntRunInDiscover'));

    await waitFor(() =>
      expect(addDanger).toHaveBeenCalledWith({ title: 'Unable to start the hunt' })
    );
    expect(navigateToUrl).not.toHaveBeenCalled();
    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('retries a failed launch with the same session id, then uses a new one for the next launch', async () => {
    const mutateAsync = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue({});
    mockMutation(mutateAsync);
    render(<RunInDiscoverButton hunt={makeDetail()} />);

    fireEvent.click(screen.getByTestId('alertZeroHuntRunInDiscover'));
    await waitFor(() => expect(addDanger).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('alertZeroHuntRunInDiscover'));
    await waitFor(() => expect(navigateToUrl).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('alertZeroHuntRunInDiscover'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(3));

    const [first, retry, next] = mutateAsync.mock.calls.map(([arg]) => arg.sessionId);
    expect(retry).toBe(first);
    expect(next).not.toBe(first);
  });

  it('is disabled when the hunt is not available to the caller', () => {
    mockMutation(jest.fn());
    render(
      <RunInDiscoverButton
        hunt={makeDetail({
          callerAvailability: unavailable([{ reason: 'unavailable_index', details: ['x*'] }]),
        })}
      />
    );

    expect(screen.getByTestId('alertZeroHuntRunInDiscover')).toBeDisabled();
  });

  it('is disabled when Discover cannot build a link', () => {
    setup({ share: false });
    mockMutation(jest.fn());
    render(<RunInDiscoverButton hunt={makeDetail()} />);

    expect(screen.getByTestId('alertZeroHuntRunInDiscover')).toBeDisabled();
  });
});
