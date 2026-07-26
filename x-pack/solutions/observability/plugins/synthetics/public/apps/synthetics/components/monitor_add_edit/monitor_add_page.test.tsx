/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorAddPage } from './monitor_add_page';
import * as useCloneMonitorModule from './hooks/use_clone_monitor';
import { GETTING_STARTED_ROUTE } from '../../../../../common/constants';
import { act } from '@testing-library/react';

describe('MonitorAddPage', () => {
  it('renders correctly', async () => {
    const { findByText } = render(<MonitorAddPage />, {
      state: {
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    // page is loaded
    expect(await findByText('Add a script')).toBeInTheDocument();
  });

  it('renders when loading', async () => {
    const { getByLabelText } = render(<MonitorAddPage />, {
      state: {
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: false,
          loading: true,
        },
      },
    });

    // page is loading
    expect(getByLabelText(/Loading/)).toBeInTheDocument();
  });

  it('redirects to getting started page when no locations are available', async () => {
    const useCloneMonitorSpy = jest
      .spyOn(useCloneMonitorModule, 'useCloneMonitor')
      .mockReturnValue({
        data: undefined,
        status: 'success' as any,
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      });
    let history: ReturnType<typeof render>['history'];

    act(() => {
      ({ history } = render(<MonitorAddPage />, {
        state: {
          serviceLocations: {
            locations: [],
            locationsLoaded: true,
            loading: false,
          },
        },
      }));
    });

    expect(history.location.pathname).toBe(GETTING_STARTED_ROUTE);
    useCloneMonitorSpy.mockRestore();
  });

  it('renders an error', async () => {
    const { getByText } = render(<MonitorAddPage />, {
      state: {
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: true,
          error: {
            name: 'an error occurred',
          },
        },
      },
    });

    // error
    expect(getByText('Unable to load testing locations')).toBeInTheDocument();
  });
});
