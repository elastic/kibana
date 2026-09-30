/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { Router } from '@kbn/shared-ux-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { TestProviders } from '../../common/mock';
import { ATTACK_DISCOVERY_PATH, SECURITY_FEATURE_ID } from '../../../common/constants';
import { mockHistory } from '../../common/utils/route/mocks';
import { AttackDiscoveryPage } from '.';
import { mockTimelines } from '../../common/mock/mock_timelines_plugin';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { mockFindAnonymizationFieldsResponse } from './mock/mock_find_anonymization_fields_response';
import { ATTACK_DISCOVERY_PAGE_TITLE } from './page_title/translations';
import { useAttackDiscovery } from './use_attack_discovery';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];

vi.mock('react-use/lib/useLocalStorage', () => ({
  default: vi.fn().mockImplementation((key, defaultValue) => {
    // Return different values based on the localStorage key
    if (key.includes('START_LOCAL_STORAGE_KEY')) {
      return ['now-24h', vi.fn()];
    }
    if (key.includes('END_LOCAL_STORAGE_KEY')) {
      return ['now', vi.fn()];
    }
    if (key.includes('CONNECTOR_ID_LOCAL_STORAGE_KEY')) {
      return ['test-id', vi.fn()];
    }
    // For other keys, return the default value or 'test-id'
    return [defaultValue || 'test-id', vi.fn()];
  }),
}));

vi.mock('react-use/lib/useSessionStorage', () => ({
  default: vi.fn().mockReturnValue([undefined, vi.fn()]),
}));

vi.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => {
    const mocked = {
      useFetchAnonymizationFields: vi.fn(() => mockFindAnonymizationFieldsResponse),
    };
    return { ...mocked, default: mocked };
  }
);

vi.mock('@kbn/inference-connectors', () => {
  const mocked = {
    useLoadConnectors: vi.fn(() => ({
      isFetched: true,
      data: mockConnectors,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock(
  '@kbn/elastic-assistant/impl/connectorland/connector_selector_inline/connector_selector_inline',
  () => {
    const mocked = {
      ConnectorSelectorInline: () => null,
    };
    return { ...mocked, default: mocked };
  }
);

const mockSecurityCapabilities = [SECURITY_UI_SHOW_PRIVILEGE];

vi.mock('../../common/links', () => {
  const mocked = {
    useLinkInfo: () =>
      vi.fn().mockReturnValue({
        capabilities: mockSecurityCapabilities,
        globalNavPosition: 4,
        globalSearchKeywords: ['Attack discovery'],
        id: 'attack_discovery',
        path: '/attack_discovery',
        title: 'Attack discovery',
      }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_attack_discovery', () => {
  const mocked = {
    useAttackDiscovery: vi.fn().mockReturnValue({
      fetchAttackDiscoveries: vi.fn(),
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

const mockFilterManager = createFilterManagerMock();

const mockDataViewsService = dataViewPluginMocks.createStartContract();

const mockUpselling = new UpsellingService();

const mockUseKibanaReturnValue = {
  services: {
    application: {
      capabilities: {
        [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true },
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
    data: {
      query: {
        filterManager: mockFilterManager,
      },
    },
    dataViews: mockDataViewsService,
    docLinks: {
      links: {
        [SECURITY_FEATURE_ID]: {
          privileges: 'link',
        },
      },
    },
    featureFlags: {
      useBooleanValue: vi.fn().mockReturnValue(false),
    },
    lens: {
      EmbeddableComponent: () => null,
    },
    notifications: vi.fn().mockReturnValue({
      addError: vi.fn(),
      addSuccess: vi.fn(),
      addWarning: vi.fn(),
      remove: vi.fn(),
    }),
    sessionView: {
      getSessionView: vi.fn(() => <div />),
    },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
    },
    telemetry: { reportEvent: vi.fn() },
    theme: {
      getTheme: vi.fn().mockReturnValue({ darkMode: false }),
    },
    timelines: { ...mockTimelines },
    triggersActionsUi: {
      alertsTableConfigurationRegistry: {},
      getAlertsStateTable: () => <></>,
    },
    uiSettings: {
      get: vi.fn(),
    },
    unifiedSearch: {
      ui: {
        SearchBar: () => null,
      },
    },
  },
};
vi.mock('../../common/lib/kibana', async () => {
  const original = await vi.importActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => mockUseKibanaReturnValue,
    useToasts: vi.fn().mockReturnValue({
      addError: vi.fn(),
      addSuccess: vi.fn(),
      addWarning: vi.fn(),
      addInfo: vi.fn(),
      remove: vi.fn(),
    }),
    useUiSetting$: vi.fn().mockReturnValue([]),
  };
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

describe('AttackDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useLoadConnectors as Mock).mockReturnValue({
      isFetched: true,
      data: mockConnectors,
    });
  });

  describe('page layout', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('renders the expected page title', () => {
      expect(screen.getByTestId('attackDiscoveryPageTitle')).toHaveTextContent(
        ATTACK_DISCOVERY_PAGE_TITLE
      );
    });

    it('renders the actions', () => {
      expect(screen.getByTestId('actions')).toBeInTheDocument();
    });

    it('renders the history', () => {
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('opens the settings flyout when the settings button is clicked', () => {
      const settingsButton = screen.getByTestId('settings');

      fireEvent.click(settingsButton);

      expect(screen.getByTestId('settingsFlyout')).toBeInTheDocument();
    });
  });

  describe('Generating ad hoc attack discoveries', () => {
    let fetchAttackDiscoveriesMock: Mock;
    beforeEach(() => {
      fetchAttackDiscoveriesMock = vi.fn();
      (useAttackDiscovery as Mock).mockReturnValue({
        fetchAttackDiscoveries: fetchAttackDiscoveriesMock,
        isLoading: false,
      });

      // Override the localStorage mock to return proper values for this test
      (useLocalStorage as Mock).mockImplementation((key: string) => {
        if (key.includes('attackDiscovery.start')) {
          return ['now-24h', vi.fn()];
        }
        if (key.includes('attackDiscovery.end')) {
          return ['now', vi.fn()];
        }
        if (key.includes('attackDiscovery.connectorId')) {
          return ['test-id', vi.fn()];
        }
        return [undefined, vi.fn()];
      });

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );
    });

    it('invokes fetchAttackDiscoveries with the expected parameters when the run button is clicked,', () => {
      const run = screen.getAllByTestId('run');

      fireEvent.click(run[0]);

      expect(fetchAttackDiscoveriesMock).toHaveBeenCalledWith({
        end: 'now',
        filter: undefined,
        overrideConnectorId: undefined,
        overrideEnd: undefined,
        overrideFilter: undefined,
        overrideSize: undefined,
        overrideStart: undefined,
        size: 100,
        start: 'now-24h',
      });
    });
  });

  describe('workflows insufficient privileges callout', () => {
    afterEach(() => {
      mockUseKibanaReturnValue.services.featureFlags.useBooleanValue.mockReturnValue(false);
      mockUseKibanaReturnValue.services.uiSettings.get.mockReturnValue(false);
    });

    it('renders the insufficient privileges callout when workflows are enabled but privileges are missing', async () => {
      mockUseKibanaReturnValue.services.featureFlags.useBooleanValue.mockReturnValue(true);
      mockUseKibanaReturnValue.services.uiSettings.get.mockReturnValue(true);

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );

      await waitFor(() => {
        expect(screen.getByText('Insufficient privileges')).toBeInTheDocument();
      });
    });

    it('does not render the insufficient privileges callout when workflows are disabled', () => {
      mockUseKibanaReturnValue.services.featureFlags.useBooleanValue.mockReturnValue(false);

      render(
        <TestProviders>
          <Router history={historyMock}>
            <UpsellingProvider upsellingService={mockUpselling}>
              <AttackDiscoveryPage />
            </UpsellingProvider>
          </Router>
        </TestProviders>
      );

      expect(screen.queryByText('Insufficient privileges')).not.toBeInTheDocument();
    });
  });
});
