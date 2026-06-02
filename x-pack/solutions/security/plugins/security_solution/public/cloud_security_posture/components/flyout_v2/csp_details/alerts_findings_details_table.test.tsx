/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertsDetailsTable } from './alerts_findings_details_table';
import { TestProviders } from '../../../../common/mock/test_providers';

jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: jest.fn().mockReturnValue({ euid: null }),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useUiSetting: jest.fn().mockReturnValue(false),
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({ to: '2023-01-01', from: '2022-01-01' }),
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn().mockReturnValue({
    loading: false,
    data: null,
    setQuery: jest.fn(),
    response: '',
    request: '',
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: jest.fn().mockReturnValue({
    loading: false,
    signalIndexName: '.alerts-security',
  }),
}));

jest.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: jest.fn().mockReturnValue({ entityRecord: null, isLoading: false }),
}));

jest.mock('../../../hooks/use_non_closed_alerts', () => ({
  useNonClosedAlerts: jest.fn().mockReturnValue({
    hasNonClosedAlerts: false,
    filteredAlertsData: null,
  }),
}));

jest.mock('../../../../common/hooks/use_navigate_to_alerts_page_with_filters', () => ({
  useNavigateToAlertsPageWithFilters: jest.fn().mockReturnValue(jest.fn()),
}));

describe('AlertsDetailsTable (v2)', () => {
  const mockOnShowAlert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsDetailsTable field="host.name" value="my-host" onShowAlert={mockOnShowAlert} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutMisconfigurationFindingsTable')).toBeInTheDocument();
  });

  it('accepts required onShowAlert callback without throwing', () => {
    expect(() =>
      render(
        <TestProviders>
          <AlertsDetailsTable
            field="host.name"
            value="my-host"
            entityId="host-entity-id"
            entityType="host"
            onShowAlert={mockOnShowAlert}
          />
        </TestProviders>
      )
    ).not.toThrow();
  });
});
