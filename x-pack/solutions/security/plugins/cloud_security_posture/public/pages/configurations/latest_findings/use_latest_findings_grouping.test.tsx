/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useLatestFindingsGrouping } from './use_latest_findings_grouping';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { useDataViewContext } from '../../../common/contexts/data_view_context';
import { useGetCspBenchmarkRulesStatesApi } from '@kbn/cloud-security-posture/src/hooks/use_get_benchmark_rules_state_api';
import { getGroupingQuery } from '@kbn/grouping';
import { useGroupedFindings } from './use_grouped_findings';

vi.mock('../../../components/cloud_security_grouping');
vi.mock('../../../common/contexts/data_view_context');
vi.mock('@kbn/cloud-security-posture/src/hooks/use_get_benchmark_rules_state_api');
vi.mock('@kbn/grouping', () => {
      const mocked = {
      getGroupingQuery: vi.fn().mockImplementation((params) => {
        return {
          query: { bool: {} },
        };
      }),
      parseGroupingQuery: vi.fn().mockReturnValue({}),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./use_grouped_findings');

describe('useLatestFindingsGrouping', () => {
  const mockGroupPanelRenderer = (
    selectedGroup: string,
    fieldBucket: any,
    nullGroupMessage?: string,
    isLoading?: boolean
  ) => <div>Mock Group Panel Renderer</div>;
  const mockGetGroupStats = vi.fn();

  beforeEach(() => {
    (useCloudSecurityGrouping as Mock).mockReturnValue({
      grouping: { selectedGroups: ['cloud.account.id'] },
    });
    (useDataViewContext as Mock).mockReturnValue({ dataView: {} });
    (useGetCspBenchmarkRulesStatesApi as Mock).mockReturnValue({ data: {} });
    (useGroupedFindings as Mock).mockReturnValue({
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

  it('includes cloudProvider aggregation for cloud.account.id grouping', () => {
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
        statsAggregations: expect.arrayContaining([
          expect.objectContaining({
            cloudProvider: {
              terms: { field: 'cloud.provider', size: 1 },
            },
          }),
        ]),
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
