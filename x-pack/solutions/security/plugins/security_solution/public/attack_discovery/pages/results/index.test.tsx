/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { AIConnector } from '@kbn/elastic-assistant';
import type { AttackDiscoveryStats } from '@kbn/elastic-assistant-common';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { mockAttackDiscovery } from '../mock/mock_attack_discovery';
import { Results } from '.';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';

jest.mock('../../../common/lib/kibana');

const mockFilterManager = createFilterManagerMock();

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const stubSecurityDataView = createStubDataView({
  spec: {
    id: 'security',
    title: 'security',
  },
});

const mockDataViewsService = {
  ...dataViewPluginMocks.createStartContract(),
  get: () => Promise.resolve(stubSecurityDataView),
  clearInstanceCache: () => Promise.resolve(),
};

const aiConnectors: AIConnector[] = [
  {
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
    isDeprecated: false,
    referencedByCount: 0,
    isSystemAction: false,
    id: 'gpt4oAzureDemo3',
    name: 'GPT-4o',
  },
];

describe('Results', () => {
  const defaultProps = {
    activePage: 0,
    aiConnectors,
    alertsContextCount: 100,
    alertsCount: 50,
    approximateFutureTime: null,
    attackDiscoveriesCount: 1,
    connectorId: 'test-connector-id',
    connectorIntervals: [],
    connectorsAreConfigured: true,
    failureReason: null,
    isLoading: false,
    isLoadingPost: false,
    loadingConnectorId: null,
    localStorageAttackDiscoveryMaxAlerts: undefined,
    onCancel: jest.fn(),
    onConnectorIdSelected: jest.fn(),
    onGenerate: jest.fn(),
    openFlyout: jest.fn(),
    onToggleShowAnonymized: jest.fn(),
    selectedConnectorAttackDiscoveries: [mockAttackDiscovery],
    selectedConnectorLastUpdated: new Date(),
    selectedConnectorReplacements: {},
    setActivePage: jest.fn(),
    showAnonymized: false,
    stats: {
      alerts: 50,
      alertsContext: 100,
      attackDiscoveries: 1,
      connectors: 1,
      newDiscoveriesCount: 0,
      newConnectorResultsCount: 0,
      statsPerConnector: [
        {
          connectorId: 'test-connector-id',
          count: 1,
          hasViewed: true,
          status: 'succeeded',
        },
      ],
    } as AttackDiscoveryStats,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true },
          },
          navigateToUrl: jest.fn(),
        },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              all: true,
              connectors: true,
              create: true,
              delete: true,
              push: true,
              read: true,
              settings: true,
              update: true,
            }),
          },
          hooks: {
            useCasesAddToExistingCase: jest.fn(),
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: jest.fn() }),
            useCasesAddToNewCaseFlyout: jest.fn(),
          },
          ui: { getCasesContext: mockCasesContext },
        },
        data: {
          dataViews: mockDataViewsService,
          query: {
            filterManager: mockFilterManager,
          },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(false), // legacy view enabled
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
  });

  it('renders the EmptyStates when showEmptyStates returns true', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} aiConnectors={[]} />
      </TestProviders>
    );

    expect(screen.getByTestId('welcome')).toBeInTheDocument();
  });

  it('calls onGenerate when the generate button is clicked', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} alertsContextCount={0} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('generate'));

    expect(defaultProps.onGenerate).toHaveBeenCalled();
  });

  it('renders the Summary when showSummary returns true', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('calls onToggleShowAnonymized when the show anonymized toggle is clicked', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('toggleAnonymized'));

    expect(defaultProps.onToggleShowAnonymized).toHaveBeenCalled();
  });

  it('renders a AttackDiscoveryPanel for the attack discovery', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('attackDiscovery')).toHaveLength(
      defaultProps.selectedConnectorAttackDiscoveries.length
    );
  });
});
