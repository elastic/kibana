/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorEditPage } from './monitor_edit_page';
import { useMonitorName } from '../../hooks/use_monitor_name';
import { ConfigKey } from '../../../../../common/runtime_types';

import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import {
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '../../../../../common/constants/monitor_defaults';

vi.mock('@kbn/observability-shared-plugin/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/observability-shared-plugin/public')),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_monitor_name', async () => {
      const mocked = {
      ...(await vi.importActual('../../hooks/use_monitor_name')),
      useMonitorName: vi.fn().mockReturnValue({ nameAlreadyExists: false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../hooks/use_kibana_space', async () => {
      const mocked = {
      ...(await vi.importActual('../../../../hooks/use_kibana_space')),
      useKibanaSpace: vi.fn().mockReturnValue({ id: 'default' }),
    };
      return { ...mocked, default: mocked };
    });

describe('MonitorEditPage', () => {
  const { FETCH_STATUS } = observabilitySharedPublic;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly', async () => {
    vi.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: {
        attributes: {
          [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
          [ConfigKey.FORM_MONITOR_TYPE]: 'multistep',
          [ConfigKey.LOCATIONS]: [],
          [ConfigKey.THROTTLING_CONFIG]: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
        },
      },
      refetch: () => null,
      loading: false,
    });

    const { getByText } = render(<MonitorEditPage />, {
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
    expect(getByText('Monitor script')).toBeInTheDocument();
  });

  it('renders when loading locations', async () => {
    const { getByLabelText } = render(<MonitorEditPage />, {
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

  it('renders when monitor is loading', async () => {
    vi.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: null,
      refetch: () => null,
      loading: true,
    });

    const { getByLabelText } = render(<MonitorEditPage />, {
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
        monitorDetails: {
          syntheticsMonitorLoading: true,
        },
      },
    });

    // page is loading
    expect(getByLabelText(/Loading/)).toBeInTheDocument();
  });

  it('renders a location error', async () => {
    const { getByText } = render(<MonitorEditPage />, {
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
          error: {
            name: 'an error occurred',
          },
        },
      },
    });

    // error
    expect(getByText('Unable to load testing locations')).toBeInTheDocument();
  });

  it('renders a monitor loading error', async () => {
    vi.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: null,
      refetch: () => null,
      loading: false,
      error: new Error('test error'),
    });
    const { getByText } = render(<MonitorEditPage />, {
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
        monitorDetails: {
          syntheticsMonitorLoading: false,
          syntheticsMonitorError: new Error('test error'),
        },
      },
    });

    // error
    expect(getByText('Unable to load monitor configuration')).toBeInTheDocument();
  });

  it.each([true, false])(
    'shows duplicate error when "nameAlreadyExists" is %s',
    async (nameAlreadyExists) => {
      (useMonitorName as Mock).mockReturnValue({ nameAlreadyExists });

      vi.spyOn(observabilitySharedPublic, 'useFetcher').mockReturnValue({
        status: FETCH_STATUS.SUCCESS,
        data: {
          attributes: {
            [ConfigKey.MONITOR_SOURCE_TYPE]: 'ui',
            [ConfigKey.FORM_MONITOR_TYPE]: 'multistep',
            [ConfigKey.MONITOR_TYPE]: 'browser',
            [ConfigKey.LOCATIONS]: [],
            [ConfigKey.THROTTLING_CONFIG]: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
          },
        },
        refetch: () => null,
        loading: false,
      });
      const { getByText, queryByText, getByTestId } = render(<MonitorEditPage />, {
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

      const inputField = getByTestId('syntheticsMonitorConfigName');
      fireEvent.focus(inputField);
      fireEvent.change(inputField, { target: { value: 'any value' } }); // Hook is made to return duplicate error as true
      fireEvent.blur(inputField);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      if (nameAlreadyExists) {
        expect(getByText('Monitor name already exists')).toBeInTheDocument();
      } else {
        expect(queryByText('Monitor name already exists')).not.toBeInTheDocument();
      }
    }
  );
});
