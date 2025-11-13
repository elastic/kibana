/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThreatHuntingHomePage } from './threat_hunting_home_page';
import { TestProviders } from '../../common/mock';
import { SecurityPageName } from '../../app/types';

// Mock components - this page renders many child components that need to be mocked
const mockSiemSearchBar = jest.fn();
jest.mock('../../common/components/search_bar', () => ({
  SiemSearchBar: (props: Record<string, unknown>) => {
    mockSiemSearchBar(props);
    const sourcererDataView = props.sourcererDataView as { id?: string } | undefined;
    return (
      <div data-test-subj="siemSearchBar" data-view-id={sourcererDataView?.id ?? ''}>
        {'Search Bar'}
      </div>
    );
  },
}));

jest.mock('../../common/components/filters_global', () => ({
  FiltersGlobal: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="filtersGlobal">{children}</div>
  ),
}));

jest.mock('../../common/components/page_wrapper', () => ({
  SecuritySolutionPageWrapper: ({
    children,
    ...rest
  }: { children: React.ReactNode } & Record<string, unknown>) => (
    <div data-test-subj={(rest['data-test-subj'] as string) ?? 'securitySolutionPageWrapper'}>
      {children}
    </div>
  ),
}));

jest.mock('../../common/components/header_page', () => ({
  HeaderPage: ({ title, ...rest }: { title: React.ReactNode } & Record<string, unknown>) => (
    <h1 data-test-subj="headerPage">{title}</h1>
  ),
}));

jest.mock('../../common/components/empty_prompt', () => ({
  EmptyPrompt: ({ onSkip }: { onSkip: () => void }) => (
    <button type="button" data-test-subj="emptyPrompt" onClick={onSkip}>
      {'Empty prompt'}
    </button>
  ),
}));

jest.mock('../../common/components/page_loader', () => ({
  PageLoader: () => <div data-test-subj="pageLoader" />,
}));

jest.mock('../components/threat_hunting', () => ({
  ThreatHuntingEntitiesTable: () => (
    <div data-test-subj="threatHuntingEntitiesTable">{'Threat table'}</div>
  ),
  ThreatHuntingEntityRiskLevels: () => (
    <div data-test-subj="threatHuntingRiskLevels">{'Risk levels'}</div>
  ),
}));

const mockSpyRoute = jest.fn();
jest.mock('../../common/utils/route/spy_routes', () => ({
  SpyRoute: (props: Record<string, unknown>) => {
    mockSpyRoute(props);
    return <div data-test-subj="spyRoute" />;
  },
}));

jest.mock('../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn(),
}));

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(),
}));

const useSourcererDataViewMock = jest.requireMock('../../sourcerer/containers')
  .useSourcererDataView as jest.Mock;
const useIsExperimentalFeatureEnabledMock = jest.requireMock(
  '../../common/hooks/use_experimental_features'
).useIsExperimentalFeatureEnabled as jest.Mock;
const useDataViewMock = jest.requireMock('../../data_view_manager/hooks/use_data_view')
  .useDataView as jest.Mock;

const renderPage = () =>
  render(
    <TestProviders>
      <ThreatHuntingHomePage />
    </TestProviders>
  );

describe('ThreatHuntingHomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSiemSearchBar.mockClear();
    mockSpyRoute.mockClear();

    useSourcererDataViewMock.mockReturnValue({
      indicesExist: true,
      loading: false,
      sourcererDataView: { id: 'legacy-view', matchedIndices: ['logs-*'] },
    });

    useIsExperimentalFeatureEnabledMock.mockImplementation(() => false);

    useDataViewMock.mockReturnValue({
      dataView: { id: 'new-view', matchedIndices: ['logs-*'] },
      status: 'ready',
    });
  });

  it('renders the page loader when the new data view picker is pristine', () => {
    useIsExperimentalFeatureEnabledMock.mockImplementation(
      (flag: string) => flag === 'newDataViewPickerEnabled'
    );
    useDataViewMock.mockReturnValue({ dataView: undefined, status: 'pristine' });

    renderPage();

    expect(screen.getByTestId('pageLoader')).toBeInTheDocument();
    expect(screen.queryByTestId('threatHuntingHomePage')).not.toBeInTheDocument();
  });

  it('shows the empty prompt when no indices are available', () => {
    useSourcererDataViewMock.mockReturnValue({
      indicesExist: false,
      loading: false,
      sourcererDataView: { id: 'legacy-view', matchedIndices: [] },
    });

    renderPage();

    expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('siemSearchBar')).not.toBeInTheDocument();
  });

  it('allows skipping the empty prompt to reveal the page content', () => {
    useSourcererDataViewMock.mockReturnValue({
      indicesExist: false,
      loading: false,
      sourcererDataView: { id: 'legacy-view', matchedIndices: [] },
    });

    renderPage();
    fireEvent.click(screen.getByTestId('emptyPrompt'));

    expect(screen.getByTestId('threatHuntingHomePage')).toBeInTheDocument();
    expect(screen.getByTestId('siemSearchBar')).toBeInTheDocument();
  });

  it('renders the main layout when indices exist', () => {
    renderPage();

    expect(screen.getByText('Entity Threat Hunting')).toBeInTheDocument();
    expect(screen.getByTestId('threatHuntingRiskLevels')).toBeInTheDocument();
    expect(screen.getByTestId('threatHuntingEntitiesTable')).toBeInTheDocument();
    expect(screen.getByTestId('spyRoute')).toBeInTheDocument();
  });

  it('passes the sourcerer data view to the search bar when the experiment is disabled', () => {
    const sourcererDataView = { id: 'legacy-view', matchedIndices: ['legacy-*'] };
    useSourcererDataViewMock.mockReturnValue({
      indicesExist: true,
      loading: false,
      sourcererDataView,
    });

    renderPage();

    const firstCall = mockSiemSearchBar.mock.calls[0][0];
    expect(firstCall.sourcererDataView).toBe(sourcererDataView);
  });

  it('passes the new data view to the search bar when the experiment is enabled', () => {
    useIsExperimentalFeatureEnabledMock.mockImplementation(
      (flag: string) => flag === 'newDataViewPickerEnabled'
    );
    const dataView = { id: 'new-view-enabled', matchedIndices: ['new-*'] };
    useDataViewMock.mockReturnValue({ dataView, status: 'ready' });

    renderPage();

    const firstCall = mockSiemSearchBar.mock.calls[0][0];
    expect(firstCall.sourcererDataView).toBe(dataView);
  });

  it('renders SpyRoute for the entity analytics overview page', () => {
    renderPage();

    expect(mockSpyRoute).toHaveBeenCalledWith(
      expect.objectContaining({ pageName: SecurityPageName.entityAnalyticsOverview })
    );
  });
});
