/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ApplicationsListPage } from './applications_list_page';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';
import { useDigitalExperienceRouter } from '../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../routes';
import { TimeRangePicker } from '../components/time_range_picker';

jest.mock('../hooks/use_kibana_services');
jest.mock('../hooks/use_time_range');
jest.mock('../hooks/use_digital_experience_router');
jest.mock('../components/time_range_picker', () => ({ TimeRangePicker: jest.fn(() => null) }));

const useKibanaServicesMock = jest.mocked(useKibanaServices);
const timeRange = { rangeFrom: 'now-15m', rangeTo: 'now' };

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useTimeRange)
    .mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange: jest.fn() });
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

const addError = jest.fn();

const createServices = (ux?: { fetchClassicRumApplications: jest.Mock }) =>
  ({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    notifications: { toasts: { addError } },
    ux,
  } as unknown as ReturnType<typeof useKibanaServices>);

describe('ApplicationsListPage', () => {
  it('lists the applications returned by ux, each linking to its application view with the time range', async () => {
    const ux = { fetchClassicRumApplications: jest.fn().mockResolvedValue(['app-a', 'app-b']) };
    useKibanaServicesMock.mockReturnValue(createServices(ux));

    render(<ApplicationsListPage />);

    const links = await screen.findAllByTestId('digitalExperienceApplicationLink');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/app/digital_experience/app-a?rangeFrom=now-15m&rangeTo=now',
      '/app/digital_experience/app-b?rangeFrom=now-15m&rangeTo=now',
    ]);
    expect(ux.fetchClassicRumApplications).toHaveBeenCalledWith({
      start: expect.any(Number),
      end: expect.any(Number),
      signal: expect.any(AbortSignal),
    });
  });

  it('shows an error toast and the empty prompt when the fetch fails', async () => {
    const error = new Error('boom');
    const ux = { fetchClassicRumApplications: jest.fn().mockRejectedValue(error) };
    useKibanaServicesMock.mockReturnValue(createServices(ux));

    render(<ApplicationsListPage />);

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(error, { title: 'Could not load the applications' })
    );
    expect(screen.getByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
  });

  it('aborts the pending fetch on unmount', () => {
    const fetchClassicRumApplications = jest.fn(
      (_params: { signal: AbortSignal }) => new Promise<string[]>(() => {})
    );
    useKibanaServicesMock.mockReturnValue(createServices({ fetchClassicRumApplications }));

    const { unmount } = render(<ApplicationsListPage />);
    const [[{ signal }]] = fetchClassicRumApplications.mock.calls;
    unmount();

    expect(signal.aborted).toBe(true);
  });

  it('shows an empty prompt when there are no results', async () => {
    const ux = { fetchClassicRumApplications: jest.fn().mockResolvedValue([]) };
    useKibanaServicesMock.mockReturnValue(createServices(ux));

    render(<ApplicationsListPage />);

    await waitFor(() => expect(ux.fetchClassicRumApplications).toHaveBeenCalled());
    expect(screen.getByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
  });

  it('fetches again when the time range picker refreshes', async () => {
    const ux = { fetchClassicRumApplications: jest.fn().mockResolvedValue([]) };
    useKibanaServicesMock.mockReturnValue(createServices(ux));
    render(<ApplicationsListPage />);
    await waitFor(() => expect(ux.fetchClassicRumApplications).toHaveBeenCalledTimes(1));

    const { onRefresh } = jest.mocked(TimeRangePicker).mock.calls[0][0];
    act(() => onRefresh());

    await waitFor(() => expect(ux.fetchClassicRumApplications).toHaveBeenCalledTimes(2));
  });

  it('shows an empty prompt without the ux plugin', () => {
    useKibanaServicesMock.mockReturnValue(createServices());

    render(<ApplicationsListPage />);

    expect(screen.getByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
  });
});
