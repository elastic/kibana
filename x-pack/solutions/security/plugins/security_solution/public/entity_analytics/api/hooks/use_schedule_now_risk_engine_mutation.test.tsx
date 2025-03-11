/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { useScheduleNowRiskEngineMutation } from './use_schedule_now_risk_engine_mutation';
import { renderMutation } from '../../../management/hooks/test_utils';
import { RISK_ENGINE_SCHEDULE_NOW_URL } from '../../../../common/constants';

const mockFetch = jest.fn();
jest.mock('../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../common/lib/kibana/kibana_react');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        http: { fetch: mockFetch },
      },
    }),
  };
});

const mockInvalidateRiskEngineStatusQuery = jest.fn();
jest.mock('./use_risk_engine_status', () => ({
  useInvalidateRiskEngineStatusQuery: () => mockInvalidateRiskEngineStatusQuery,
}));

const mockedScheduledResponse = { test: 'response' };

describe('Schedule rule run hook', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockInvalidateRiskEngineStatusQuery.mockClear();
  });

  it('schedules risk engine run by calling the API', async () => {
    mockFetch.mockResolvedValue(mockedScheduledResponse);

    const result: ReturnType<typeof useScheduleNowRiskEngineMutation> = await renderMutation(() =>
      useScheduleNowRiskEngineMutation()
    );

    await act(async () => {
      const res = await result.mutateAsync();
      expect(res).toEqual(mockedScheduledResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(RISK_ENGINE_SCHEDULE_NOW_URL, {
        method: 'POST',
        version: '2023-10-31',
      });
    });
  });

  it('should invalidate the status API when the schedule run is called', async () => {
    mockFetch.mockResolvedValue(mockedScheduledResponse);
    const result: ReturnType<typeof useScheduleNowRiskEngineMutation> = await renderMutation(() =>
      useScheduleNowRiskEngineMutation()
    );
    await result.mutateAsync();
    expect(mockInvalidateRiskEngineStatusQuery).toHaveBeenCalledTimes(1);
  });
});
