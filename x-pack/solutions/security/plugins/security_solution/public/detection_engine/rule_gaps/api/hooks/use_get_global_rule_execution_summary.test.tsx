/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetGlobalExecutionSummaryResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/rule/apis/global_execution_summary';
import { GapRangeValue } from '../../constants';
import { getGlobalRuleExecutionSummary } from '../api';
import {
  GET_GLOBAL_RULE_EXECUTION_SUMMARY,
  useGetGlobalRuleExecutionSummary,
} from './use_get_global_rule_execution_summary';
import type { QueryFunctionContext } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { getGapRange } from './utils';

jest.mock('../api', () => ({
  getGlobalRuleExecutionSummary: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('./utils', () => ({
  getGapRange: jest.fn(),
}));

const useQueryMock = useQuery as jest.MockedFunction<typeof useQuery>;
const getGlobalRuleExecutionSummaryMock = getGlobalRuleExecutionSummary as jest.MockedFunction<
  typeof getGlobalRuleExecutionSummary
>;
const getGapRangeMock = getGapRange as jest.MockedFunction<typeof getGapRange>;

describe('useGetGlobalRuleExecutionSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetGlobalRuleExecutionSummary({ range: GapRangeValue.LAST_24_H });
  });

  it('should call useQuery with the correct parameters', () => {
    expect(useQueryMock).toHaveBeenCalledTimes(1);
    expect(useQueryMock.mock.calls[0][0]).toEqual([
      GET_GLOBAL_RULE_EXECUTION_SUMMARY,
      GapRangeValue.LAST_24_H,
    ]);
    expect(useQueryMock.mock.calls[0][1]).toBeInstanceOf(Function);
    expect(useQueryMock.mock.calls[0][2]).toMatchSnapshot();
  });

  it('should pass a function that calls getGlobalRuleExecutionSummary and return its value', async () => {
    const callFn = useQueryMock.mock.calls[0][1];
    const fetchedSummary = {} as GetGlobalExecutionSummaryResponseBodyV1;
    getGlobalRuleExecutionSummaryMock.mockResolvedValue(fetchedSummary);
    getGapRangeMock.mockReturnValue({
      start: '2025-03-25T00:00:00.000Z',
      end: '2025-03-26T00:00:00.000Z',
    });

    const signal = {} as AbortSignal;

    const result = await callFn({ signal } as QueryFunctionContext);

    expect(getGapRangeMock).toHaveBeenCalledWith(GapRangeValue.LAST_24_H);
    expect(getGlobalRuleExecutionSummaryMock.mock.calls).toMatchSnapshot();
    expect(result).toBe(fetchedSummary);
  });
});
