/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseCriticalAlerts } from './use_critical_alerts';
import { useCriticalAlerts } from './use_critical_alerts';
import { waitFor, renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import * as i18n from '../translations';
import { useQueryAlerts } from '../../../../../detections/containers/detection_engine/alerts/use_query';
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_query');
const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const dateNow = new Date('2022-04-15T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

jest.mock('../../../../../common/lib/kibana');

const props: UseCriticalAlerts = {
  from: '2020-07-07T08:20:18.966Z',
  fromCompare: '2020-07-06T08:20:18.966Z',
  skip: false,
  signalIndexName: '.alerts-default',
  to: '2020-07-08T08:20:18.966Z',
  toCompare: '2020-07-07T08:20:18.966Z',
};

const basicData = {
  updatedAt: dateNow,
  testRef: 'criticalAlerts',
  description: i18n.CRITICAL_ALERTS_DESCRIPTION,
  title: i18n.CRITICAL_ALERTS_STAT,
};

const basicReturn = {
  loading: false,
  setQuery: jest.fn(),
};

describe('useCriticalAlerts', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  const mockUseQueryAlerts = useQueryAlerts as jest.Mock;

  beforeEach(() => {
    mockUseQueryAlerts.mockReturnValue({
      data: { aggregations: { open: { critical: { doc_count: 100 } } } },
      ...basicReturn,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('loads initial state', async () => {
    // mock useQuery into state before data fetch
    mockUseQueryAlerts.mockReturnValue({
      ...basicReturn,
      data: null,
    });

    const { result } = renderHook(() => useCriticalAlerts(props), {
      wrapper: wrapperContainer,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA('alerts'),
        },
        ...basicData,
      });
    });
  });
  it('finds positive percentage change', async () => {
    mockUseQueryAlerts.mockImplementation((args) =>
      props.from === args.query.query.bool.filter[0].range['@timestamp'].gte
        ? {
            data: { aggregations: { open: { critical: { doc_count: 100 } } } },
            ...basicReturn,
          }
        : {
            data: { aggregations: { open: { critical: { doc_count: 50 } } } },
            ...basicReturn,
          }
    );
    const { result } = renderHook(() => useCriticalAlerts(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '100',
        isLoading: false,
        percentage: {
          percent: '+100.0%',
          color: 'danger',
          note: i18n.STAT_DIFFERENCE({
            upOrDown: 'up',
            percentageChange: '100.0%',
            stat: '50',
            statType: 'open critical alert count',
          }),
        },
        ...basicData,
      })
    );
  });
  it('finds negative percentage change', async () => {
    mockUseQueryAlerts.mockImplementation((args) =>
      props.from === args.query.query.bool.filter[0].range['@timestamp'].gte
        ? {
            data: { aggregations: { open: { critical: { doc_count: 50 } } } },
            ...basicReturn,
          }
        : {
            data: { aggregations: { open: { critical: { doc_count: 100 } } } },
            ...basicReturn,
          }
    );
    const { result } = renderHook(() => useCriticalAlerts(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '50',
        isLoading: false,
        percentage: {
          percent: '-50.0%',
          color: 'success',
          note: i18n.STAT_DIFFERENCE({
            upOrDown: 'down',
            percentageChange: '50.0%',
            stat: '100',
            statType: 'open critical alert count',
          }),
        },
        ...basicData,
      })
    );
  });
  it('finds zero percentage change', async () => {
    mockUseQueryAlerts.mockImplementation((args) => ({
      data: { aggregations: { open: { critical: { doc_count: 100 } } } },
      ...basicReturn,
    }));
    const { result } = renderHook(() => useCriticalAlerts(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '100',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: i18n.NO_CHANGE('open critical alert count'),
        },
        ...basicData,
      })
    );
  });
  it('handles null data - current time range', async () => {
    mockUseQueryAlerts.mockImplementation((args) =>
      props.from === args.query.query.bool.filter[0].range['@timestamp'].gte
        ? {
            data: null,
            ...basicReturn,
          }
        : {
            data: { aggregations: { open: { critical: { doc_count: 100 } } } },
            ...basicReturn,
          }
    );
    const { result } = renderHook(() => useCriticalAlerts(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA_CURRENT('alerts'),
        },
        ...basicData,
      })
    );
  });
  it('handles null data - compare time range', async () => {
    mockUseQueryAlerts.mockImplementation((args) =>
      props.from === args.query.query.bool.filter[0].range['@timestamp'].gte
        ? {
            data: { aggregations: { open: { critical: { doc_count: 100 } } } },
            ...basicReturn,
          }
        : {
            data: null,
            ...basicReturn,
          }
    );
    const { result } = renderHook(() => useCriticalAlerts(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '100',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA_COMPARE('alerts'),
        },
        ...basicData,
      })
    );
  });
  it('handles null data - current & compare time range', async () => {
    mockUseQueryAlerts.mockImplementation((args) =>
      props.from === args.query.query.bool.filter[0].range['@timestamp'].gte ||
      props.fromCompare === args.query.query.bool.filter[0].range['@timestamp'].gte
        ? {
            data: { aggregations: { open: { critical: { doc_count: 100 } } } },
            ...basicReturn,
          }
        : {
            data: null,
            ...basicReturn,
          }
    );
    let ourProps = props;
    const { result, rerender } = renderHook(() => useCriticalAlerts(ourProps), {
      wrapper: wrapperContainer,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '100',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: i18n.NO_CHANGE('open critical alert count'),
        },
        ...basicData,
      })
    );

    ourProps = {
      ...props,
      from: '2020-09-08T08:20:18.966Z',
      to: '2020-09-09T08:20:18.966Z',
      fromCompare: '2020-09-07T08:20:18.966Z',
      toCompare: '2020-09-08T08:20:18.966Z',
    };
    rerender();
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA('alerts'),
        },
        ...basicData,
      })
    );
  });
  it('handles undefined data - current & compare time range', async () => {
    mockUseQueryAlerts.mockImplementation((args) =>
      props.from === args.query.query.bool.filter[0].range['@timestamp'].gte ||
      props.fromCompare === args.query.query.bool.filter[0].range['@timestamp'].gte
        ? {
            data: { aggregations: { open: { critical: { doc_count: 100 } } } },
            ...basicReturn,
          }
        : {
            data: undefined,
            ...basicReturn,
          }
    );
    let ourProps = props;
    const { result, rerender } = renderHook(() => useCriticalAlerts(ourProps), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '100',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: i18n.NO_CHANGE('open critical alert count'),
        },
        ...basicData,
      })
    );
    ourProps = {
      ...props,
      from: '2020-09-08T08:20:18.966Z',
      to: '2020-09-09T08:20:18.966Z',
      fromCompare: '2020-09-07T08:20:18.966Z',
      toCompare: '2020-09-08T08:20:18.966Z',
    };
    rerender();
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA('alerts'),
        },
        ...basicData,
      })
    );
  });
});
