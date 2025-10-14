/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { Router } from '@kbn/shared-ux-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { History } from '.';
import { ATTACK_DISCOVERY_PATH, SECURITY_FEATURE_ID } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock';
import { mockHistory } from '../../../../common/utils/route/mocks';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { useFindAttackDiscoveries } from '../../use_find_attack_discoveries';
import { useGetAttackDiscoveryGenerations } from '../../use_get_attack_discovery_generations';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useSearchParams: jest.fn(() => [{ get: jest.fn() }]),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useDateFormat: jest.fn(),
  useKibana: jest.fn(),
  useToasts: jest.fn(() => ({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  })),
}));

(mockUseKibana as jest.Mock).mockReturnValue({
  services: {
    application: {
      capabilities: {
        [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true, configurations: true },
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
    theme: {
      getTheme: jest.fn().mockReturnValue({ darkMode: false }),
    },
  },
});

jest.mock('../../use_dismiss_attack_discovery_generations', () => ({
  useDismissAttackDiscoveryGeneration: jest.fn().mockReturnValue({
    dismiss: jest.fn(),
    mutateAsync: jest.fn(),
  }),
}));

jest.mock('../../use_find_attack_discoveries', () => ({
  useFindAttackDiscoveries: jest.fn().mockReturnValue({
    cancelRequest: jest.fn(),
    data: { data: [], total: 0 },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useInvalidateFindAttackDiscoveries: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('../../use_get_attack_discovery_generations', () => ({
  useGetAttackDiscoveryGenerations: jest.fn().mockReturnValue({
    cancelRequest: jest.fn(),
    data: {
      generations: [
        {
          alerts_context_count: 84,
          connector_id: 'claudeV3Haiku',
          discoveries: 1,
          end: '2025-05-02T17:46:43.486Z',
          loading_message:
            'AI is analyzing up to 100 alerts from now-30d to now to generate discoveries.',
          execution_uuid: '27384b25-5fc0-4d11-a04f-42b2707092fa',
          generation_start_time: '2025-05-02T17:45:25.426Z',
          start: '2025-05-02T17:45:25.426Z',
          status: 'succeeded',
          connector_stats: {
            average_successful_duration_nanoseconds: 78060000000,
            successful_generations: 1,
          },
        },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useInvalidateGetAttackDiscoveryGenerations: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('./use_ids_from_url', () => ({
  useIdsFromUrl: jest.fn().mockReturnValue({
    ids: ['alert-1'],
    setIdsUrl: jest.fn(),
  }),
}));

const mockUseKibanaFeatureFlags = jest
  .fn()
  .mockReturnValue({ attackDiscoveryPublicApiEnabled: false });
jest.mock('../../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

const historyMock = {
  ...mockHistory,
  location: {
    hash: '',
    pathname: ATTACK_DISCOVERY_PATH,
    search: '',
    state: '',
  },
};

const defaultProps = {
  aiConnectors: [],
  localStorageAttackDiscoveryMaxAlerts: undefined,
  onGenerate: jest.fn(),
  onToggleShowAnonymized: jest.fn(),
  showAnonymized: false,
};

describe('History', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks to their default state
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      cancelRequest: jest.fn(),
      data: { data: [], total: 0 },
      isLoading: false,
      refetch: jest.fn(),
    });

    (useGetAttackDiscoveryGenerations as jest.Mock).mockReturnValue({
      cancelRequest: jest.fn(),
      data: {
        generations: [
          {
            alerts_context_count: 84,
            connector_id: 'claudeV3Haiku',
            discoveries: 1,
            end: '2025-05-02T17:46:43.486Z',
            loading_message:
              'AI is analyzing up to 100 alerts from now-30d to now to generate discoveries.',
            execution_uuid: '27384b25-5fc0-4d11-a04f-42b2707092fa',
            generation_start_time: '2025-05-02T17:45:25.426Z',
            start: '2025-05-02T17:45:25.426Z',
            status: 'succeeded',
            connector_stats: {
              average_successful_duration_nanoseconds: 78060000000,
              successful_generations: 1,
            },
          },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <History {...defaultProps} />
          </Router>
        </TestProviders>
      );
    });

    it('renders the SearchAndFilter', () => {
      expect(screen.getByTestId('searchAndFilterQueryQuery')).toBeInTheDocument();
    });

    it('renders the Summary', () => {
      expect(screen.getByTestId('summary')).toBeInTheDocument();
    });

    it('renders the Generations', () => {
      expect(screen.getByTestId('generations')).toBeInTheDocument();
    });
  });

  it('calls refetchFindAttackDiscoveries on refresh', async () => {
    const refetchMock = jest.fn();
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      cancelRequest: jest.fn(),
      data: { data: [], total: 0 },
      isLoading: false,
      refetch: refetchMock,
    });

    render(
      <TestProviders>
        <Router history={historyMock}>
          <History {...defaultProps} />
        </Router>
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });
  });

  it('renders an empty prompt when data is empty', () => {
    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      cancelRequest: jest.fn(),
      data: { data: [], total: 0 },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <Router history={historyMock}>
          <History {...defaultProps} />
        </Router>
      </TestProviders>
    );

    expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
  });

  describe('refetching generations', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('sets up interval to refetch generations every 10 seconds', () => {
      const refetchGenerationsMock = jest.fn();
      (useGetAttackDiscoveryGenerations as jest.Mock).mockReturnValue({
        cancelRequest: jest.fn(),
        data: { generations: [] },
        isLoading: false,
        refetch: refetchGenerationsMock,
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <History {...defaultProps} />
          </Router>
        </TestProviders>
      );

      expect(refetchGenerationsMock).not.toHaveBeenCalled();
      jest.advanceTimersByTime(10000);

      expect(refetchGenerationsMock).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(10000);

      expect(refetchGenerationsMock).toHaveBeenCalledTimes(2);
    });

    it('clears the interval and cancels requests on unmount', () => {
      const cancelFindAttackDiscoveriesRequestMock = jest.fn();
      const cancelGetAttackDiscoveryGenerationsMock = jest.fn();

      (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
        cancelRequest: cancelFindAttackDiscoveriesRequestMock,
        data: { data: [], total: 0 },
        isLoading: false,
        refetch: jest.fn(),
      });

      (useGetAttackDiscoveryGenerations as jest.Mock).mockReturnValue({
        cancelRequest: cancelGetAttackDiscoveryGenerationsMock,
        data: { generations: [] },
        isLoading: false,
        refetch: jest.fn(),
      });

      const { unmount } = render(
        <TestProviders>
          <Router history={historyMock}>
            <History {...defaultProps} />
          </Router>
        </TestProviders>
      );

      unmount();

      expect(cancelFindAttackDiscoveriesRequestMock).toHaveBeenCalled();
      expect(cancelGetAttackDiscoveryGenerationsMock).toHaveBeenCalled();
    });
  });

  it('calls onToggleShowAnonymized when clicked', () => {
    const onToggleMock = jest.fn();

    render(
      <TestProviders>
        <Router history={historyMock}>
          <History {...defaultProps} onToggleShowAnonymized={onToggleMock} />
        </Router>
      </TestProviders>
    );

    const anonymizedToggleButton = screen.getByTestId('toggleAnonymized');
    fireEvent.click(anonymizedToggleButton);

    expect(onToggleMock).toHaveBeenCalled();
  });

  describe('handles multiple pages of data', () => {
    let multiPageData;

    beforeEach(() => {
      const data = getMockAttackDiscoveryAlerts();
      // Create enough data for multiple pages
      multiPageData = [
        ...data,
        ...Array.from({ length: 50 }).map((_, index) => ({
          ...data[0],
          id: `custom-id-${index + 1}`,
        })),
      ];

      (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
        cancelRequest: jest.fn(),
        data: {
          data: multiPageData.slice(0, 25), // First page
          total: multiPageData.length,
        },
        isLoading: false,
        refetch: jest.fn(),
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <History {...defaultProps} />
          </Router>
        </TestProviders>
      );
    });

    it('shows page 1 as selected', () => {
      expect(screen.getByTestId('pagination-button-0')).toHaveAttribute('aria-current', 'page');
    });

    it('enables the next page button', () => {
      const nextPageButton = screen.getByTestId('pagination-button-next');
      expect(nextPageButton).not.toBeDisabled();
    });
  });

  it('updates the current page when the next button is clicked', () => {
    const data = getMockAttackDiscoveryAlerts();

    // Create multiple pages
    const multiPageData = [
      ...data,
      ...Array.from({ length: 20 }).map((_, index) => ({
        ...data[0],
        id: `custom-id-${index + 1}`,
        title: `Custom Attack Discovery ${index + 1}`,
      })),
    ];

    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      cancelRequest: jest.fn(),
      data: {
        data: multiPageData,
        total: multiPageData.length,
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <Router history={historyMock}>
          <History {...defaultProps} />
        </Router>
      </TestProviders>
    );

    // Go to next page - this should reset selected attack discoveries
    const nextPageButton = screen.getByTestId('pagination-button-next');

    fireEvent.click(nextPageButton);

    expect(screen.getByTestId('pagination-button-1')).toHaveAttribute('aria-current', 'page');
  });

  describe('resets page and selected attack discoveries when changing items per page', () => {
    let multiPageData;

    beforeEach(() => {
      const data = getMockAttackDiscoveryAlerts();
      // Create 20 items to have multiple pages
      multiPageData = [
        ...data,
        ...Array.from({ length: 15 }).map((_, index) => ({
          ...data[0],
          id: `custom-id-${index + 1}`,
          title: `Custom Attack Discovery ${index + 1}`,
        })),
      ];

      (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
        cancelRequest: jest.fn(),
        data: {
          data: multiPageData,
          total: multiPageData.length,
        },
        isLoading: false,
        refetch: jest.fn(),
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <History {...defaultProps} />
          </Router>
        </TestProviders>
      );
    });

    it('navigates to page 2 when next is clicked', () => {
      const nextPageButton = screen.getByTestId('pagination-button-next');
      fireEvent.click(nextPageButton);

      expect(screen.getByTestId('pagination-button-1')).toHaveAttribute('aria-current', 'page');
    });

    it('resets to the first page when items per page is changed', () => {
      // Go to page 2 first
      const nextPageButton = screen.getByTestId('pagination-button-next');
      fireEvent.click(nextPageButton);

      expect(screen.getByTestId('pagination-button-1')).toHaveAttribute('aria-current', 'page');

      // Open the items per page popover
      const tablePaginationPopoverButton = screen.getByTestId('tablePaginationPopoverButton');
      fireEvent.click(tablePaginationPopoverButton);

      // Select 20 rows per page
      const tablePagination20Rows = screen.getByTestId('tablePagination-20-rows');
      fireEvent.click(tablePagination20Rows);

      // Should reset to first page
      expect(screen.getByTestId('pagination-button-0')).toHaveAttribute('aria-current', 'page');
    });
  });

  it('renders with filter by alert IDs when provided', () => {
    render(
      <TestProviders>
        <Router history={historyMock}>
          <History {...defaultProps} />
        </Router>
      </TestProviders>
    );

    expect(screen.getByText('_id: alert-1')).toBeInTheDocument();
  });

  it('renders Attack discoveries', () => {
    const data = getMockAttackDiscoveryAlerts();

    (useFindAttackDiscoveries as jest.Mock).mockReturnValue({
      cancelRequest: jest.fn(),
      data: {
        data,
        total: data.length,
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <Router history={historyMock}>
          <History
            aiConnectors={[]}
            localStorageAttackDiscoveryMaxAlerts={undefined}
            onGenerate={jest.fn()}
            onToggleShowAnonymized={jest.fn()}
            showAnonymized={false}
          />
        </Router>
      </TestProviders>
    );

    expect(screen.getAllByTestId(/^attackDiscoveryPanel-/).length).toEqual(data.length);
  });
});
