/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getByTestId, queryByTestId } from '@testing-library/react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { Subject } from 'rxjs';
import { render } from '../../../utils/test_helper';
import type { GetSLOResponse } from '@kbn/slo-schema';
import { baseSlo } from '../../../data/slo';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { hasSloGroupBy, SloOverviewPanelContent } from './slo_overview_panel_content';

jest.mock('../../../hooks/use_fetch_slo_details');
jest.mock('./slo_overview', () => ({
  SloOverview: () => <div data-test-subj="slo-overview">SloOverview</div>,
}));
jest.mock('./slo_overview_grid', () => ({
  SloCardChartList: () => <div data-test-subj="slo-card-chart-list">SloCardChartList</div>,
}));
jest.mock('./group_view/group_view', () => ({
  GroupSloView: () => <div data-test-subj="group-slo-view">GroupSloView</div>,
}));

const useFetchSloDetailsMock = useFetchSloDetails as jest.MockedFunction<typeof useFetchSloDetails>;

const defaultProps = {
  sloId: 'slo-123',
  sloInstanceId: ALL_VALUE,
  overviewMode: 'single' as const,
  groupFilters: undefined,
  remoteName: undefined,
  reloadSubject: new Subject<boolean>(),
};

const sloWithoutGroupBy: GetSLOResponse = { ...baseSlo, id: 'slo-12345678' };
const sloWithGroupBy: GetSLOResponse = { ...baseSlo, id: 'slo-12345678', groupBy: ['host'] };

describe('hasSloGroupBy', () => {
  it('returns false when groupBy is null or undefined', () => {
    expect(hasSloGroupBy(undefined)).toBe(false);
    expect(hasSloGroupBy(null as unknown as undefined)).toBe(false);
  });

  it('returns false when groupBy is empty array', () => {
    expect(hasSloGroupBy([])).toBe(false);
  });

  it('returns false when groupBy is only ALL_VALUE', () => {
    expect(hasSloGroupBy(ALL_VALUE)).toBe(false);
    expect(hasSloGroupBy([ALL_VALUE])).toBe(false);
  });

  it('returns true when groupBy has a real field', () => {
    expect(hasSloGroupBy(['host'])).toBe(true);
    expect(hasSloGroupBy('host')).toBe(true);
    expect(hasSloGroupBy(['host', 'datacenter'])).toBe(true);
  });
});

describe('SloOverviewPanelContent', () => {
  beforeEach(() => {
    useFetchSloDetailsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isInitialLoading: false,
      isRefetching: false,
      isSuccess: false,
      isError: false,
      refetch: jest.fn(),
    });
  });

  it('renders group overview panel when overviewMode is groups', () => {
    const { container } = render(
      <SloOverviewPanelContent
        {...defaultProps}
        overviewMode="groups"
        groupFilters={{ group_by: 'status', groups: [], kql_query: '' }}
      />
    );

    expect(getByTestId(container, 'sloGroupOverviewPanel')).toBeInTheDocument();
    expect(queryByTestId(container, 'sloSingleOverviewPanel')).not.toBeInTheDocument();
    expect(queryByTestId(container, 'slo-overview')).not.toBeInTheDocument();
  });

  it('renders GroupSloView inside group overview panel', () => {
    const { container } = render(
      <SloOverviewPanelContent
        {...defaultProps}
        overviewMode="groups"
        groupFilters={{ group_by: 'slo.tags', groups: ['tag1'], kql_query: 'my-query' }}
      />
    );

    expect(getByTestId(container, 'group-slo-view')).toBeInTheDocument();
  });

  it('renders group overview panel with default groupFilters', () => {
    const { container } = render(
      <SloOverviewPanelContent
        {...defaultProps}
        overviewMode="groups"
        groupFilters={{ group_by: 'status' }}
      />
    );

    expect(getByTestId(container, 'sloGroupOverviewPanel')).toBeInTheDocument();
    expect(getByTestId(container, 'group-slo-view')).toBeInTheDocument();
    expect(queryByTestId(container, 'slo-overview')).not.toBeInTheDocument();
  });

  it('renders single overview (SloOverview) when overviewMode is single and SLO has no group_by', () => {
    useFetchSloDetailsMock.mockReturnValue({
      data: sloWithoutGroupBy,
      isLoading: false,
      isInitialLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { container } = render(<SloOverviewPanelContent {...defaultProps} />);

    expect(getByTestId(container, 'slo-overview')).toBeInTheDocument();
    expect(queryByTestId(container, 'sloGroupOverviewPanel')).not.toBeInTheDocument();
    expect(queryByTestId(container, 'sloSingleOverviewPanel')).not.toBeInTheDocument();
  });

  it('renders single overview when overviewMode is single and instance is not ALL', () => {
    useFetchSloDetailsMock.mockReturnValue({
      data: sloWithGroupBy,
      isLoading: false,
      isInitialLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { container } = render(
      <SloOverviewPanelContent {...defaultProps} sloInstanceId="instance-1" />
    );

    expect(getByTestId(container, 'slo-overview')).toBeInTheDocument();
    expect(queryByTestId(container, 'sloSingleOverviewPanel')).not.toBeInTheDocument();
  });

  it('renders card list when overviewMode is single, instance is ALL, and SLO has group_by', () => {
    useFetchSloDetailsMock.mockReturnValue({
      data: sloWithGroupBy,
      isLoading: false,
      isInitialLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { container } = render(<SloOverviewPanelContent {...defaultProps} />);

    expect(getByTestId(container, 'sloSingleOverviewPanel')).toBeInTheDocument();
    expect(getByTestId(container, 'slo-card-chart-list')).toBeInTheDocument();
    expect(queryByTestId(container, 'slo-overview')).not.toBeInTheDocument();
    expect(queryByTestId(container, 'sloGroupOverviewPanel')).not.toBeInTheDocument();
  });

  it('renders single overview when overviewMode is single, instance is ALL, but sloId is missing', () => {
    useFetchSloDetailsMock.mockReturnValue({
      data: sloWithGroupBy,
      isLoading: false,
      isInitialLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: jest.fn(),
    });

    const { container } = render(<SloOverviewPanelContent {...defaultProps} sloId={undefined} />);

    expect(getByTestId(container, 'slo-overview')).toBeInTheDocument();
    expect(queryByTestId(container, 'sloSingleOverviewPanel')).not.toBeInTheDocument();
  });
});
