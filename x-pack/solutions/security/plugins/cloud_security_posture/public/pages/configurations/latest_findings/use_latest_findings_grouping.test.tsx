/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useLatestFindingsGrouping } from './use_latest_findings_grouping';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { useDataViewContext } from '../../../common/contexts/data_view_context';
import { useGetCspBenchmarkRulesStatesApi } from '@kbn/cloud-security-posture/src/hooks/use_get_benchmark_rules_state_api';
import { getGroupingQuery } from '@kbn/grouping';
import { useGroupedFindings } from './use_grouped_findings';

jest.mock('../../../components/cloud_security_grouping');
jest.mock('../../../common/contexts/data_view_context');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_get_benchmark_rules_state_api');
jest.mock('@kbn/grouping', () => ({
  getGroupingQuery: jest.fn().mockImplementation((params) => {
    return {
      query: { bool: {} },
    };
  }),
  parseGroupingQuery: jest.fn().mockReturnValue({}),
}));
jest.mock('./use_grouped_findings');

describe('useLatestFindingsGrouping', () => {
  const mockGroupPanelRenderer = (
    selectedGroup: string,
    fieldBucket: any,
    nullGroupMessage?: string,
    isLoading?: boolean
  ) => <div>Mock Group Panel Renderer</div>;
  const mockGetGroupStats = jest.fn();

  beforeEach(() => {
    (useCloudSecurityGrouping as jest.Mock).mockReturnValue({
      grouping: { selectedGroups: ['cloud.account.id'] },
    });
    (useDataViewContext as jest.Mock).mockReturnValue({ dataView: {} });
    (useGetCspBenchmarkRulesStatesApi as jest.Mock).mockReturnValue({ data: {} });
    (useGroupedFindings as jest.Mock).mockReturnValue({
      data: {},
      isFetching: false,
    });
  });

  it('calls getGroupingQuery with correct rootAggregations', () => {
    renderHook(() =>
      useLatestFindingsGrouping({
        groupPanelRenderer: mockGroupPanelRenderer,
        getGroupStats: mockGetGroupStats,
        groupingLevel: 0,
        groupFilters: [],
        selectedGroup: 'cloud.account.id',
      })
    );

    expect(getGroupingQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        rootAggregations: [
          {
            failedFindings: {
              filter: {
                term: {
                  'result.evaluation': { value: 'failed' },
                },
              },
            },
            passedFindings: {
              filter: {
                term: {
                  'result.evaluation': { value: 'passed' },
                },
              },
            },
            nullGroupItems: {
              missing: { field: 'cloud.account.id' },
            },
          },
        ],
      })
    );
  });

  it('calls getGroupingQuery without nullGroupItems when selectedGroup is "none"', () => {
    renderHook(() =>
      useLatestFindingsGrouping({
        groupPanelRenderer: mockGroupPanelRenderer,
        getGroupStats: mockGetGroupStats,
        groupingLevel: 0,
        groupFilters: [],
        selectedGroup: 'none',
      })
    );

    expect(getGroupingQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        rootAggregations: [
          {
            failedFindings: {
              filter: {
                term: {
                  'result.evaluation': { value: 'failed' },
                },
              },
            },
            passedFindings: {
              filter: {
                term: {
                  'result.evaluation': { value: 'passed' },
                },
              },
            },
          },
        ],
      })
    );
  });
});
