/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../flyout_v2/use_flyout_api.mock';

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      matchPath: vi.fn(),
      useLocation: vi.fn().mockReturnValue({
        search: '',
      }),
      withRouter: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/shared-ux-router', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/shared-ux-router')),
      useSearchParams: vi.fn(() => [{ get: vi.fn() }]),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useDateFormat: vi.fn(),
      useKibana: vi.fn(() => ({
        services: {
          application: {
            capabilities: {
              siemV2: { crud_alerts: true, read_alerts: true },
              siemV3: { configurations: true },
              siemV4: { configurations: true },
              siemV5: { configurations: true },
            },
            navigateToUrl: vi.fn(),
          },
          cases: {
            helpers: {
              canUseCases: vi.fn().mockReturnValue({
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
              useCasesAddToExistingCase: vi.fn(),
              useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({ open: vi.fn() }),
              useCasesAddToNewCaseFlyout: vi.fn(),
            },
            ui: { getCasesContext: mockCasesContext },
          },
          featureFlags: {
            useBooleanValue: vi.fn().mockReturnValue(false),
          },
          uiSettings: {
            get: vi.fn().mockReturnValue(false),
          },
          theme: {
            getTheme: vi.fn().mockReturnValue({ darkMode: false }),
          },
        },
      })),
      useToasts: vi.fn(() => ({
        addError: vi.fn(),
        addSuccess: vi.fn(),
        addWarning: vi.fn(),
        addInfo: vi.fn(),
        remove: vi.fn(),
      })),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../flyout_v2/use_flyout_api');

vi.mock(
  '../attack_discovery_markdown_formatter/field_markdown_renderer/use_entity_euid_from_alerts',
  async () => {
      const mocked = {
        useEntityEuidFromAlerts: vi.fn(() => ({ euid: undefined, isLoading: false })),
        ENTITY_TYPE_BY_FIELD: (await vi.importActual('../attack_discovery_markdown_formatter/field_markdown_renderer/helpers')).ENTITY_TYPE_BY_FIELD,
      };
      return { ...mocked, default: mocked };
    }
);

(mockUseKibana as Mock).mockReturnValue({
  services: {
    data: {
      search: {
        search: vi.fn().mockReturnValue({ toPromise: vi.fn().mockResolvedValue({}) }),
      },
    },
    application: {
      capabilities: {
        [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true, configurations: true },
      },
      navigateToUrl: vi.fn(),
    },
    cases: {
      helpers: {
        canUseCases: vi.fn().mockReturnValue({
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
        useCasesAddToExistingCase: vi.fn(),
        useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({ open: vi.fn() }),
        useCasesAddToNewCaseFlyout: vi.fn(),
      },
      ui: { getCasesContext: mockCasesContext },
    },
    featureFlags: {
      useBooleanValue: vi.fn().mockReturnValue(false),
    },
    uiSettings: {
      get: vi.fn().mockReturnValue(false),
    },
    theme: {
      getTheme: vi.fn().mockReturnValue({ darkMode: false }),
    },
  },
});

vi.mock('../../use_dismiss_attack_discovery_generations', () => {
      const mocked = {
      useDismissAttackDiscoveryGeneration: vi.fn().mockReturnValue({
        dismiss: vi.fn(),
        mutateAsync: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../use_find_attack_discoveries', () => {
      const mocked = {
      useFindAttackDiscoveries: vi.fn().mockReturnValue({
        cancelRequest: vi.fn(),
        data: { data: [], total: 0 },
        isLoading: false,
        refetch: vi.fn(),
      }),
      useInvalidateFindAttackDiscoveries: vi.fn().mockReturnValue(vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../use_get_attack_discovery_generations', () => {
      const mocked = {
      useGetAttackDiscoveryGenerations: vi.fn().mockReturnValue({
        cancelRequest: vi.fn(),
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
        refetch: vi.fn(),
      }),
      useInvalidateGetAttackDiscoveryGenerations: vi.fn().mockReturnValue(vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./use_ids_from_url', () => {
      const mocked = {
      useIdsFromUrl: vi.fn().mockReturnValue({
        ids: ['alert-1'],
        setIdsUrl: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

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
  onGenerate: vi.fn(),
  onToggleShowAnonymized: vi.fn(),
  showAnonymized: false,
};

describe('History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());

    // Reset mocks to their default state
    (useFindAttackDiscoveries as Mock).mockReturnValue({
      cancelRequest: vi.fn(),
      data: { data: [], total: 0 },
      isLoading: false,
      refetch: vi.fn(),
    });

    (useGetAttackDiscoveryGenerations as Mock).mockReturnValue({
      cancelRequest: vi.fn(),
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
      refetch: vi.fn(),
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
    const refetchMock = vi.fn();
    (useFindAttackDiscoveries as Mock).mockReturnValue({
      cancelRequest: vi.fn(),
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
    (useFindAttackDiscoveries as Mock).mockReturnValue({
      cancelRequest: vi.fn(),
      data: { data: [], total: 0 },
      isLoading: false,
      refetch: vi.fn(),
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
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('sets up interval to refetch generations every 10 seconds', () => {
      const refetchGenerationsMock = vi.fn();
      (useGetAttackDiscoveryGenerations as Mock).mockReturnValue({
        cancelRequest: vi.fn(),
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
      vi.advanceTimersByTime(10000);

      expect(refetchGenerationsMock).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(10000);

      expect(refetchGenerationsMock).toHaveBeenCalledTimes(2);
    });

    it('clears the interval and cancels requests on unmount', () => {
      const cancelFindAttackDiscoveriesRequestMock = vi.fn();
      const cancelGetAttackDiscoveryGenerationsMock = vi.fn();

      (useFindAttackDiscoveries as Mock).mockReturnValue({
        cancelRequest: cancelFindAttackDiscoveriesRequestMock,
        data: { data: [], total: 0 },
        isLoading: false,
        refetch: vi.fn(),
      });

      (useGetAttackDiscoveryGenerations as Mock).mockReturnValue({
        cancelRequest: cancelGetAttackDiscoveryGenerationsMock,
        data: { generations: [] },
        isLoading: false,
        refetch: vi.fn(),
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
    const onToggleMock = vi.fn();

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

      (useFindAttackDiscoveries as Mock).mockReturnValue({
        cancelRequest: vi.fn(),
        data: {
          data: multiPageData.slice(0, 25), // First page
          total: multiPageData.length,
        },
        isLoading: false,
        refetch: vi.fn(),
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

    (useFindAttackDiscoveries as Mock).mockReturnValue({
      cancelRequest: vi.fn(),
      data: {
        data: multiPageData,
        total: multiPageData.length,
      },
      isLoading: false,
      refetch: vi.fn(),
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

      (useFindAttackDiscoveries as Mock).mockReturnValue({
        cancelRequest: vi.fn(),
        data: {
          data: multiPageData,
          total: multiPageData.length,
        },
        isLoading: false,
        refetch: vi.fn(),
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

    (useFindAttackDiscoveries as Mock).mockReturnValue({
      cancelRequest: vi.fn(),
      data: {
        data,
        total: data.length,
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <TestProviders>
        <Router history={historyMock}>
          <History
            aiConnectors={[]}
            localStorageAttackDiscoveryMaxAlerts={undefined}
            onGenerate={vi.fn()}
            onToggleShowAnonymized={vi.fn()}
            showAnonymized={false}
          />
        </Router>
      </TestProviders>
    );

    expect(screen.getAllByTestId(/^attackDiscoveryPanel-/).length).toEqual(data.length);
  });
});
