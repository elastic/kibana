/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import { useSocTrends } from './use_soc_trends';
import { TestProviders } from '../../../../../common/mock';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
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

jest.mock('../../../../../common/containers/use_global_time');
describe('useSocTrends', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  beforeEach(() => {
    (useGlobalTime as jest.Mock).mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      deleteQuery: () => {},
      to: '2020-07-08T08:20:18.966Z',
      setQuery: () => {},
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('loads initial state', async () => {
    const { result } = renderHook(
      () => useSocTrends({ skip: false, signalIndexName: '.alerts-default' }),
      {
        wrapper: wrapperContainer,
      }
    );
    await waitFor(() => {
      expect(result.current).toEqual({
        stats: [
          {
            stat: '-',
            isLoading: true,
            percentage: {
              percent: null,
              color: 'hollow',
              note: i18n.NO_DATA('case'),
            },
            testRef: 'casesMttr',
            title: i18n.CASES_MTTR_STAT,
            description: i18n.CASES_MTTR_DESCRIPTION,
            updatedAt: dateNow,
          },
          {
            stat: '-',
            isLoading: true,
            percentage: {
              percent: null,
              color: 'hollow',
              note: i18n.NO_DATA('alerts'),
            },
            testRef: 'criticalAlerts',
            title: i18n.CRITICAL_ALERTS_STAT,
            description: i18n.CRITICAL_ALERTS_DESCRIPTION,
            updatedAt: dateNow,
          },
        ],
        isUpdating: true,
        latestUpdate: dateNow,
      });
    });
  });
});
