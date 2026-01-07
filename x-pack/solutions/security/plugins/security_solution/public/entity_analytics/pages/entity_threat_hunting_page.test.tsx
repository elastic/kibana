/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EntityThreatHuntingPage } from './entity_threat_hunting_page';
import { TestProviders } from '../../common/mock';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';

jest.mock('../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn(() => ({
    indicesExist: true,
    loading: false,
    sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
  })),
}));

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn((flag: string) => {
    if (flag === 'newDataViewPickerEnabled') return false;
    return false;
  }),
}));

jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    dataView: { id: 'test', matchedIndices: ['index-1'] },
    status: 'ready',
  })),
}));

jest.mock('../components/threat_hunting/combined_risk_donut_chart', () => ({
  CombinedRiskDonutChart: () => (
    <div data-test-subj="combined-risk-donut-chart">{'Donut Chart'}</div>
  ),
}));

jest.mock('../components/threat_hunting/anomalies_placeholder_panel', () => ({
  AnomaliesPlaceholderPanel: () => (
    <div data-test-subj="anomalies-placeholder-panel">{'Anomalies Placeholder'}</div>
  ),
}));

jest.mock('../components/threat_hunting/threat_hunting_entities_table', () => ({
  ThreatHuntingEntitiesTable: () => (
    <div data-test-subj="threat-hunting-entities-table">{'Entities Table'}</div>
  ),
}));

const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseDataView = useDataView as jest.Mock;

describe('EntityThreatHuntingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
    });

    mockUseIsExperimentalFeatureEnabled.mockImplementation((flag: string) => {
      if (flag === 'newDataViewPickerEnabled') return false;
      return false;
    });

    mockUseDataView.mockReturnValue({
      dataView: { id: 'test', matchedIndices: ['index-1'] },
      status: 'ready',
    });
  });

  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByText('Entity Threat Hunting')).toBeInTheDocument();
  });

  it('renders the KQL search bar', () => {
    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    // The SiemSearchBar should be rendered within FiltersGlobal
    expect(screen.getByTestId('threatHuntingPage')).toBeInTheDocument();
  });

  it('renders the combined donut chart', () => {
    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('combined-risk-donut-chart')).toBeInTheDocument();
  });

  it('renders the anomalies placeholder panel', () => {
    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('anomalies-placeholder-panel')).toBeInTheDocument();
  });

  it('renders the entities table', () => {
    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('threat-hunting-entities-table')).toBeInTheDocument();
  });

  it('renders loading spinner when sourcerer is loading', () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      loading: true,
      sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
    });

    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('threatHuntingLoader')).toBeInTheDocument();
  });

  it('renders empty prompt when indices do not exist', () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: false,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: [] },
    });

    mockUseDataView.mockReturnValue({
      dataView: { id: 'test', matchedIndices: [] },
      status: 'ready',
    });

    render(
      <MemoryRouter>
        <EntityThreatHuntingPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    // EmptyPrompt should be rendered
    expect(screen.queryByTestId('threatHuntingPage')).not.toBeInTheDocument();
  });
});
