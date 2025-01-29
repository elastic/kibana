/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { SyntheticsUrlParams } from '../utils/url_params/get_supported_url_params';
import { useMonitorsSortedByStatus } from './use_monitors_sorted_by_status';
import { WrappedHelper } from '../utils/testing';
import * as URL from './use_url_params';

describe('useMonitorsSortedByStatus', () => {
  const location1 = {
    url: 'mockUrl',
    id: 'us_central',
    label: 'US Central',
    isServiceManaged: true,
  };

  const location2 = {
    url: 'mockUrl',
    id: 'us_east',
    label: 'US East',
    isServiceManaged: true,
  };

  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;

  beforeEach(() => {
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');

    jest.clearAllMocks();
  });

  const WrapperWithState = ({
    children,
    sortOrder = 'asc',
  }: React.PropsWithChildren<{
    sortOrder: 'asc' | 'desc';
  }>) => {
    return (
      <WrappedHelper
        state={{
          serviceLocations: {
            locationsLoaded: true,
            loading: false,
            locations: [location1, location2],
          },
          overview: {
            pageState: {
              perPage: 10,
              sortOrder,
              sortField: 'name.keyword',
            },
          },
          overviewStatus: {
            status: {
              upConfigs: {
                [`test-monitor-up-1-${location2.id}`]: {
                  configId: 'test-monitor-up-1',
                  locationId: location2.id,
                  name: 'test-monitor-up-1',
                },
                [`test-monitor-up-2-${location2.id}`]: {
                  configId: 'test-monitor-up-2',
                  locationId: location2.id,
                  name: 'test-monitor-up-2',
                },
                [`test-monitor-3-${location2.id}`]: {
                  configId: 'test-monitor-3',
                  locationId: location2.id,
                  name: 'test-monitor-3',
                },
              },
              downConfigs: {
                [`test-monitor-down-1-${location1.id}`]: {
                  configId: 'test-monitor-down-1',
                  locationId: location1.id,
                  name: 'test-monitor-down-1',
                },
                [`test-monitor-down-2-${location1.id}`]: {
                  configId: 'test-monitor-down-2',
                  locationId: location1.id,
                  name: 'test-monitor-down-2',
                },
                [`test-monitor-3${location1.id}`]: {
                  configId: 'test-monitor-3',
                  locationId: location1.id,
                  name: 'test-monitor-3',
                },
              },
              pendingConfigs: {
                [`test-monitor-4-${location1.id}`]: {
                  configId: 'test-monitor-4',
                  locationId: location1.id,
                  name: 'test-monitor-4',
                },
              },
            },
            disabledConfigs: {
              [`test-monitor-disabled-1-${location1.id}`]: {
                configId: 'test-monitor-disabled-1',
                locationId: location1.id,
                name: 'test-monitor-disabled-1',
              },
            } as any,
          },
        }}
      >
        {React.createElement(React.Fragment, null, children)}
      </WrappedHelper>
    );
  };

  it('returns monitors down first when sort order is asc', () => {
    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }) => React.createElement(WrapperWithState, null, children),
    });
    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "configId": "test-monitor-3",
          "locationId": "us_central",
          "name": "test-monitor-3",
        },
        Object {
          "configId": "test-monitor-3",
          "locationId": "us_east",
          "name": "test-monitor-3",
        },
        Object {
          "configId": "test-monitor-4",
          "locationId": "us_central",
          "name": "test-monitor-4",
        },
        Object {
          "configId": "test-monitor-disabled-1",
          "locationId": "us_central",
          "name": "test-monitor-disabled-1",
        },
        Object {
          "configId": "test-monitor-down-1",
          "locationId": "us_central",
          "name": "test-monitor-down-1",
        },
        Object {
          "configId": "test-monitor-down-2",
          "locationId": "us_central",
          "name": "test-monitor-down-2",
        },
        Object {
          "configId": "test-monitor-up-1",
          "locationId": "us_east",
          "name": "test-monitor-up-1",
        },
        Object {
          "configId": "test-monitor-up-2",
          "locationId": "us_east",
          "name": "test-monitor-up-2",
        },
      ]
    `);
  });

  it('returns monitors up first when sort order is desc', () => {
    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "configId": "test-monitor-up-2",
          "locationId": "us_east",
          "name": "test-monitor-up-2",
        },
        Object {
          "configId": "test-monitor-up-1",
          "locationId": "us_east",
          "name": "test-monitor-up-1",
        },
        Object {
          "configId": "test-monitor-down-2",
          "locationId": "us_central",
          "name": "test-monitor-down-2",
        },
        Object {
          "configId": "test-monitor-down-1",
          "locationId": "us_central",
          "name": "test-monitor-down-1",
        },
        Object {
          "configId": "test-monitor-disabled-1",
          "locationId": "us_central",
          "name": "test-monitor-disabled-1",
        },
        Object {
          "configId": "test-monitor-4",
          "locationId": "us_central",
          "name": "test-monitor-4",
        },
        Object {
          "configId": "test-monitor-3",
          "locationId": "us_central",
          "name": "test-monitor-3",
        },
        Object {
          "configId": "test-monitor-3",
          "locationId": "us_east",
          "name": "test-monitor-3",
        },
      ]
    `);
  });

  it('returns only up monitors when statusFilter is down', () => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: 'up',
    } as SyntheticsUrlParams);

    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "configId": "test-monitor-up-2",
          "locationId": "us_east",
          "name": "test-monitor-up-2",
        },
        Object {
          "configId": "test-monitor-up-1",
          "locationId": "us_east",
          "name": "test-monitor-up-1",
        },
        Object {
          "configId": "test-monitor-3",
          "locationId": "us_east",
          "name": "test-monitor-3",
        },
      ]
    `);
  });

  it('returns only down monitors when statusFilter is down', () => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: 'down',
    } as SyntheticsUrlParams);

    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "configId": "test-monitor-down-2",
          "locationId": "us_central",
          "name": "test-monitor-down-2",
        },
        Object {
          "configId": "test-monitor-down-1",
          "locationId": "us_central",
          "name": "test-monitor-down-1",
        },
        Object {
          "configId": "test-monitor-3",
          "locationId": "us_central",
          "name": "test-monitor-3",
        },
      ]
    `);
  });

  it('returns only disabled monitors when statusFilter is down', () => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: 'disabled',
    } as SyntheticsUrlParams);

    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toMatchInlineSnapshot(`
      Array [
        Object {
          "configId": "test-monitor-disabled-1",
          "locationId": "us_central",
          "name": "test-monitor-disabled-1",
        },
      ]
    `);
  });
});
