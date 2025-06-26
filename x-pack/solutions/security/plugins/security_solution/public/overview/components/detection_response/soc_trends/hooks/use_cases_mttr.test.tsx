/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseCasesMttr } from './use_cases_mttr';
import { useCasesMttr } from './use_cases_mttr';
import { act, waitFor, renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useKibana as useKibanaMock } from '../../../../../common/lib/kibana/__mocks__';
import * as i18n from '../translations';

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
const props: UseCasesMttr = {
  deleteQuery: jest.fn(),
  from: '2020-07-07T08:20:18.966Z',
  fromCompare: '2020-07-06T08:20:18.966Z',
  setQuery: jest.fn(),
  skip: false,
  to: '2020-07-08T08:20:18.966Z',
  toCompare: '2020-07-07T08:20:18.966Z',
};

const basicData = {
  updatedAt: dateNow,
  testRef: 'casesMttr',
  description: i18n.CASES_MTTR_DESCRIPTION,
  title: i18n.CASES_MTTR_STAT,
};

describe('useCasesMttr', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  const mockGetCasesMetrics = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads initial state', async () => {
    const { result } = renderHook(() => useCasesMttr(props), {
      wrapper: wrapperContainer,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        stat: '-',
        isLoading: true,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA('case'),
        },
        ...basicData,
      });
    });
  });

  it('finds positive percentage change', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({ mttr: 5000 });
    const { result } = renderHook(() => useCasesMttr(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '2h',
        isLoading: false,
        percentage: {
          percent: '+100.0%',
          color: 'danger',
          note: i18n.STAT_DIFFERENCE({
            upOrDown: 'up',
            percentageChange: '100.0%',
            stat: '1h',
            statType: 'case resolution time',
          }),
        },
        ...basicData,
      })
    );
  });
  it('finds negative percentage change', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 5000 })
      .mockReturnValue({ mttr: 10000 });
    const { result } = renderHook(() => useCasesMttr(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '1h',
        isLoading: false,
        percentage: {
          percent: '-50.0%',
          color: 'success',
          note: i18n.STAT_DIFFERENCE({
            upOrDown: 'down',
            percentageChange: '50.0%',
            stat: '2h',
            statType: 'case resolution time',
          }),
        },
        ...basicData,
      })
    );
  });
  it('finds zero percentage change', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics.mockReturnValue({
      mttr: 10000,
    });
    const { result } = renderHook(() => useCasesMttr(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '2h',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: i18n.NO_CHANGE('case resolution time'),
        },
        ...basicData,
      })
    );
  });
  it('handles null mttr - current time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: null })
      .mockReturnValue({ mttr: 10000 });
    const { result } = renderHook(() => useCasesMttr(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA_CURRENT('case'),
        },
        ...basicData,
      })
    );
  });
  it('handles null mttr - compare time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({ mttr: null });
    const { result } = renderHook(() => useCasesMttr(props), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '2h',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA_COMPARE('case'),
        },
        ...basicData,
      })
    );
  });
  it('handles null mttr - current & compare time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({
        mttr: null,
      });
    let ourProps = props;
    const { result, rerender } = renderHook(() => useCasesMttr(ourProps), {
      wrapper: wrapperContainer,
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '2h',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: i18n.NO_CHANGE('case resolution time'),
        },
        ...basicData,
      })
    );

    ourProps = {
      ...props,
      from: '2020-07-08T08:20:18.966Z',
      to: '2020-07-09T08:20:18.966Z',
    };
    rerender();
    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA('case'),
        },
        ...basicData,
      })
    );
  });
  it('handles undefined mttr - current & compare time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({
        mttr: undefined,
      });
    let ourProps = props;
    const { result, rerender } = renderHook(() => useCasesMttr(ourProps), {
      wrapper: wrapperContainer,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '2h',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: i18n.NO_CHANGE('case resolution time'),
        },
        ...basicData,
      })
    );

    ourProps = {
      ...props,
      from: '2020-07-08T08:20:18.966Z',
      to: '2020-07-09T08:20:18.966Z',
    };

    act(() => {
      rerender();
      rerender();
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        stat: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: i18n.NO_DATA('case'),
        },
        ...basicData,
      })
    );
  });
});
