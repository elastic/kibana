/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EntityAnalyticsPage } from './entity_analytics_dashboard';
import { TestProviders } from '../../common/mock';

import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useEntityAnalyticsTypes } from '../hooks/use_enabled_entity_types';

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
    if (flag === 'entityStoreDisabled') return false;
    return false;
  }),
}));

jest.mock('../../data_view_manager/hooks/use_data_view_spec', () => ({
  useDataViewSpec: jest.fn(() => ({
    dataViewSpec: { id: 'experimental', matchedIndices: ['index-2'] },
  })),
}));

jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    dataView: { matchedIndices: ['index-2'] },
    status: 'ready',
  })),
}));

jest.mock('../hooks/use_enabled_entity_types', () => ({
  useEntityAnalyticsTypes: jest.fn(() => ['host', 'user']),
}));

jest.mock('../components/entity_store/components/dashboard_entity_store_panels', () => ({
  EntityStoreDashboardPanels: () => <div data-test-subj="entityStoreDashboardPanels" />,
}));

jest.mock('../components/entity_analytics_risk_score', () => ({
  EntityAnalyticsRiskScores: ({ riskEntity }: { riskEntity: string }) => (
    <div data-test-subj={`entityAnalyticsRiskScores-${riskEntity}`} />
  ),
}));

jest.mock('../components/entity_analytics_header', () => ({
  EntityAnalyticsHeader: () => <div data-test-subj="entityAnalyticsHeader" />,
}));

jest.mock('../components/entity_analytics_anomalies', () => ({
  EntityAnalyticsAnomalies: () => <div data-test-subj="entityAnalyticsAnomalies" />,
}));

jest.mock('../../common/components/empty_prompt', () => ({
  EmptyPrompt: ({ onSkip }: { onSkip: () => void }) => (
    <button type="button" data-test-subj="emptyPrompt" onClick={onSkip}>
      {'EmptyPrompt'}
    </button>
  ),
}));

describe('EntityAnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: true,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
    });

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((flag: string) => {
      if (flag === 'newDataViewPickerEnabled') return false;
      if (flag === 'entityStoreDisabled') return false;
      return false;
    });
  });

  it('renders the main sections when indices exist and entityStore is enabled', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('entityStoreDashboardPanels')).toBeInTheDocument();
    expect(screen.getByTestId('entityAnalyticsAnomalies')).toBeInTheDocument();
  });

  it('renders entity analytics title by default', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    const continueLink = screen.queryByText('Continue without integrations');
    if (continueLink) {
      userEvent.click(continueLink);
    }

    expect(screen.getByText('Entity analytics')).toBeInTheDocument();
  });

  it('renders Entity analytics title', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );
    expect(screen.getByText('Entity analytics')).toBeInTheDocument();
  });

  it('renders loading spinner when sourcerer is loading', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: true,
      loading: true,
      sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
    });

    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('entityAnalyticsLoader')).toBeInTheDocument();
  });

  it('renders risk score panels when entityStore feature flag is disabled', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((flag: string) => {
      if (flag === 'entityStoreDisabled') return true;
      return false;
    });

    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('entityAnalyticsRiskScores-host')).toBeInTheDocument();
    expect(screen.getByTestId('entityAnalyticsRiskScores-user')).toBeInTheDocument();
    expect(screen.queryByTestId('entityStoreDashboardPanels')).not.toBeInTheDocument();
  });

  it('renders EmptyPrompt when indices do not exist', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: false,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: [] },
    });

    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('entityAnalyticsPage')).not.toBeInTheDocument();
  });

  it('skips EmptyPrompt and renders main content when onSkip is called', async () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: false,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: [] },
    });

    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    const emptyPromptButton = screen.getByTestId('emptyPrompt');
    fireEvent.click(emptyPromptButton);

    await waitFor(() => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
      expect(screen.getByTestId('entityAnalyticsPage')).toBeInTheDocument();
    });
  });

  it('renders only enabled entity types in risk score panels', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((flag: string) => {
      if (flag === 'entityStoreDisabled') return true;
      return false;
    });

    (useEntityAnalyticsTypes as jest.Mock).mockReturnValue(['host']);

    render(
      <MemoryRouter>
        <EntityAnalyticsPage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('entityAnalyticsRiskScores-host')).toBeInTheDocument();
    expect(screen.queryByTestId('entityAnalyticsRiskScores-user')).not.toBeInTheDocument();
  });
});
