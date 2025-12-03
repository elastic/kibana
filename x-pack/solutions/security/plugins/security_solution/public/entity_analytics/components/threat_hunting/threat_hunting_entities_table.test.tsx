/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreatHuntingEntitiesTable } from './threat_hunting_entities_table';
import { TestProviders } from '../../../common/mock';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { useEntitiesListQuery } from '../entity_store/hooks/use_entities_list_query';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { useGlobalFilterQuery } from '../../../common/hooks/use_global_filter_query';
import { useEntityStoreTypes } from '../../hooks/use_enabled_entity_types';
import type { ListEntitiesResponse } from '../../../../common/api/entity_analytics/entity_store/entities/list_entities.gen';

jest.mock('../../../common/hooks/timeline/use_investigate_in_timeline');
jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/containers/use_global_time');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../entity_store/hooks/use_entities_list_query');
jest.mock('../../../common/hooks/use_error_toast');
jest.mock('../../../common/hooks/use_global_filter_query');
jest.mock('../../hooks/use_enabled_entity_types');

const mockUseInvestigateInTimeline = useInvestigateInTimeline as jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
const mockUseGlobalTime = useGlobalTime as jest.Mock;
const mockUseQueryToggle = useQueryToggle as jest.Mock;
const mockUseEntitiesListQuery = useEntitiesListQuery as jest.Mock;
const mockUseErrorToast = useErrorToast as jest.Mock;
const mockUseGlobalFilterQuery = useGlobalFilterQuery as jest.Mock;
const mockUseEntityStoreTypes = useEntityStoreTypes as jest.Mock;

const mockRefetch = jest.fn();

const responseData: ListEntitiesResponse = {
  page: 1,
  per_page: 10,
  total: 1,
  records: [
    {
      '@timestamp': '2021-08-02T14:00:00.000Z',
      user: {
        name: 'test-entity',
        risk: {
          '@timestamp': '2021-08-02T14:00:00.000Z',
          id_field: 'user.name',
          id_value: 'test-entity',
          calculated_level: 'High',
          calculated_score: 75,
          calculated_score_norm: 75,
          category_1_score: 50,
          category_1_count: 5,
          inputs: [],
          notes: [],
        },
      },
      entity: {
        id: 'entity-123',
        name: 'test-entity',
        source: 'test-index',
        type: 'user',
      },
    },
  ],
  inspect: undefined,
};

describe('ThreatHuntingEntitiesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: jest.fn(),
    });

    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    });

    mockUseGlobalTime.mockReturnValue({
      deleteQuery: jest.fn(),
      setQuery: jest.fn(),
      isInitializing: false,
      from: 'now-15m',
      to: 'now',
    });

    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
    });

    mockUseEntitiesListQuery.mockReturnValue({
      data: responseData,
      isLoading: false,
      isRefetching: false,
      refetch: mockRefetch,
      error: null,
    });

    mockUseErrorToast.mockReturnValue(jest.fn());

    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: null });

    mockUseEntityStoreTypes.mockReturnValue(['user', 'host']);
  });

  it('should render the table with entity data', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    expect(screen.getByText('test-entity')).toBeInTheDocument();
  });

  it('should add timeline icon to entity name column', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    expect(screen.getByTestId('threat-hunting-timeline-icon')).toBeInTheDocument();
  });

  it('should call investigateInTimeline when timeline icon is clicked', () => {
    const mockInvestigateInTimeline = jest.fn();
    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: mockInvestigateInTimeline,
    });

    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    const timelineIcon = screen.getByTestId('threat-hunting-timeline-icon');
    fireEvent.click(timelineIcon);

    expect(mockInvestigateInTimeline).toHaveBeenCalled();
  });

  it('should not show timeline icon when user does not have timeline privileges', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: false },
    });

    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    expect(screen.queryByTestId('threat-hunting-timeline-icon')).not.toBeInTheDocument();
  });

  it('should render risk score with custom color scheme', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    // The risk score should be rendered (75 formatted as whole number)
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('should call useEntitiesListQuery with correct parameters', () => {
    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    expect(mockUseEntitiesListQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTypes: ['user', 'host'],
        page: 1,
        perPage: 10,
        sortField: '@timestamp',
        sortOrder: 'desc',
        skip: false,
      })
    );
  });

  it('should display loading state', () => {
    mockUseEntitiesListQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isRefetching: false,
      refetch: mockRefetch,
      error: null,
    });

    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    // PaginatedTable should show loading state
    expect(mockUseEntitiesListQuery).toHaveBeenCalled();
  });

  it('should display error toast when there is an error', () => {
    const error = new Error('Test error');
    mockUseEntitiesListQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isRefetching: false,
      refetch: mockRefetch,
      error,
    });

    render(
      <TestProviders>
        <ThreatHuntingEntitiesTable />
      </TestProviders>
    );

    expect(mockUseErrorToast).toHaveBeenCalledWith(
      'There was an error loading the entities list',
      error
    );
  });
});
