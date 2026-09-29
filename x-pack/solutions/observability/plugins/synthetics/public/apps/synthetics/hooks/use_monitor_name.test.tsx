/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { fetchMonitorManagementList } from '../state';
import { useMonitorName } from './use_monitor_name';

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useParams: vi.fn().mockReturnValue({ monitorId: '12345' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../state', async () => {
      const mocked = {
      ...(await vi.importActual('../state')),
      fetchMonitorManagementList: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useMonitorName', () => {
  const testMonitors = [
    {
      name: 'Test monitor name',
      config_id: '12345',
      locations: [
        {
          id: 'us_central_qa',
        },
      ],
    },
    {
      name: 'Test monitor name 2',
      config_id: '12346',
      locations: [
        {
          id: 'us_central_qa',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (fetchMonitorManagementList as Mock).mockResolvedValue({
      monitors: testMonitors,
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns expected initial and after load state', async () => {
    const { result } = renderHook(() => useMonitorName({}));

    expect(result.current).toStrictEqual({
      loading: true,
      values: [],
      nameAlreadyExists: false,
    });

    await waitFor(() => result.current.values);

    expect(result.current).toStrictEqual({
      loading: false,
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
      nameAlreadyExists: false,
    });
  });

  it('returns correct "nameAlreadyExists" when name matches', async () => {
    const { result } = renderHook(() => useMonitorName({ search: 'Test monitor name 2' }));

    await waitFor(() => result.current.values); // Wait until data has been loaded
    expect(result.current).toStrictEqual({
      loading: false,
      nameAlreadyExists: true,
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
    });
  });

  it('returns expected results after data while editing monitor', async () => {
    const { result } = renderHook(() => useMonitorName({ search: 'Test monitor name' }));

    await waitFor(() => result.current.values); // Wait until data has been loaded
    expect(result.current).toStrictEqual({
      loading: false,
      nameAlreadyExists: false, // Should be `false` for the currently editing monitor,
      values: [
        {
          key: '12346',
          label: 'Test monitor name 2',
          locationIds: ['us_central_qa'],
        },
      ],
    });
  });
});
