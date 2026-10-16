/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApplicationsListPage } from './applications_list_page';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';

jest.mock('../hooks/use_kibana_services');
jest.mock('../hooks/use_time_range', () => ({
  ...jest.requireActual('../hooks/use_time_range'),
  useTimeRange: jest.fn(),
}));

const useKibanaServicesMock = jest.mocked(useKibanaServices);
const timeRange = { rangeFrom: 'now-15m', rangeTo: 'now' };

beforeEach(() => {
  jest.mocked(useTimeRange).mockReturnValue({ timeRange, setTimeRange: jest.fn() });
});

const createServices = (ux?: { fetchClassicRumApplications: jest.Mock }) =>
  ({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
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
    });
  });

  it('shows an empty prompt when there are no results', async () => {
    const ux = { fetchClassicRumApplications: jest.fn().mockResolvedValue([]) };
    useKibanaServicesMock.mockReturnValue(createServices(ux));

    render(<ApplicationsListPage />);

    await waitFor(() => expect(ux.fetchClassicRumApplications).toHaveBeenCalled());
    expect(screen.getByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
  });

  it('shows an empty prompt without the ux plugin', () => {
    useKibanaServicesMock.mockReturnValue(createServices());

    render(<ApplicationsListPage />);

    expect(screen.getByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
  });
});
