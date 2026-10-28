/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const timeRange = { rangeFrom: 'now-15m', rangeTo: 'now' };

const mockTimeRange = (range: ReturnType<typeof useTimeRange>['timeRange']) =>
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: range,
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });

const renderPage = (fetchClassicRumApplications?: jest.Mock) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    ux: fetchClassicRumApplications ? { fetchClassicRumApplications } : undefined,
  } as unknown as ReturnType<typeof useKibanaServices>);
  return render(<ApplicationsListPage />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTimeRange(timeRange);
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

describe('ApplicationsListPage', () => {
  it('lists the applications, each linking to its application view with the time range', async () => {
    const fetchApplications = jest.fn().mockResolvedValue(['app-a', 'app-b']);
    renderPage(fetchApplications);

    const links = await screen.findAllByTestId('digitalExperienceApplicationLink');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/app/digital_experience/app-a?rangeFrom=now-15m&rangeTo=now',
      '/app/digital_experience/app-b?rangeFrom=now-15m&rangeTo=now',
    ]);
    expect(fetchApplications).toHaveBeenCalledWith({
      start: expect.any(Number),
      end: expect.any(Number),
      signal: expect.any(AbortSignal),
    });
  });

  it('shows the loading state, not the empty prompt, while the request is pending', () => {
    renderPage(jest.fn(() => new Promise<string[]>(() => {})));

    expect(screen.getByText('Loading applications…')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).not.toBeInTheDocument();
  });

  it('shows the empty prompt when there are no applications', async () => {
    renderPage(jest.fn().mockResolvedValue([]));

    expect(await screen.findByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
  });

  it('shows that the data is unavailable, not the empty prompt, without the ux plugin', () => {
    renderPage();

    expect(screen.getByTestId('digitalExperienceApplicationsUnavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceApplicationsTable')).not.toBeInTheDocument();
  });

  it('shows the error with a retry, not the empty prompt, when the request fails', async () => {
    const fetchApplications = jest.fn().mockRejectedValue(new Error('boom'));
    renderPage(fetchApplications);

    expect(await screen.findByTestId('digitalExperienceApplicationsError')).toHaveTextContent(
      'boom'
    );
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).not.toBeInTheDocument();

    fetchApplications.mockResolvedValue(['app-a']);
    fireEvent.click(screen.getByTestId('digitalExperienceApplicationsRetry'));

    expect(await screen.findByTestId('digitalExperienceApplicationLink')).toBeInTheDocument();
  });

  it('drops the previous results and reports an invalid range without fetching', async () => {
    const fetchApplications = jest.fn().mockResolvedValue(['app-a']);
    const { rerender } = renderPage(fetchApplications);
    await screen.findByTestId('digitalExperienceApplicationLink');

    mockTimeRange({ rangeFrom: 'not-a-date', rangeTo: 'now' });
    rerender(<ApplicationsListPage />);

    expect(await screen.findByTestId('digitalExperienceApplicationsError')).toHaveTextContent(
      'Invalid Dates'
    );
    expect(screen.queryByTestId('digitalExperienceApplicationLink')).not.toBeInTheDocument();
    expect(fetchApplications).toHaveBeenCalledTimes(1);
  });

  it('fetches again when the time range picker refreshes', async () => {
    const fetchApplications = jest.fn().mockResolvedValue([]);
    renderPage(fetchApplications);
    await waitFor(() => expect(fetchApplications).toHaveBeenCalledTimes(1));

    const { onRefresh } = jest.mocked(TimeRangePicker).mock.calls[0][0];
    act(() => onRefresh());

    await waitFor(() => expect(fetchApplications).toHaveBeenCalledTimes(2));
  });

  it('aborts the pending request on unmount', () => {
    const fetchApplications = jest.fn(
      (_params: { signal: AbortSignal }) => new Promise<string[]>(() => {})
    );
    const { unmount } = renderPage(fetchApplications);
    const [[{ signal }]] = fetchApplications.mock.calls;

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
