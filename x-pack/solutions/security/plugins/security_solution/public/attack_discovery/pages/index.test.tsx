/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from '@kbn/cases-plugin/public/mocks/mock_cases_context';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import { Router } from '@kbn/shared-ux-router';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { TestProviders } from '../../common/mock';
import {
  ATTACK_DISCOVERY_PATH,
  ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING,
  SECURITY_FEATURE_ID,
} from '../../../common/constants';
import { mockHistory } from '../../common/utils/route/mocks';
import { AttackDiscoveryPage } from '.';
import { mockTimelines } from '../../common/mock/mock_timelines_plugin';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { mockFindAnonymizationFieldsResponse } from './mock/mock_find_anonymization_fields_response';
import { ATTACK_DISCOVERY_PAGE_TITLE } from './page_title/translations';
import { useAttackDiscovery } from './use_attack_discovery';
import { useLoadConnectors } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';
import { SECURITY_UI_SHOW_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { CALLOUT_TEST_DATA_ID } from './moving_attacks_callout';
import { useMovingAttacksCallout } from './moving_attacks_callout/use_moving_attacks_callout';
import { mockUseMovingAttacksCallout } from './moving_attacks_callout/use_moving_attacks_callout.mock';

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];

jest.mock('react-use/lib/useLocalStorage', () =>
  jest.fn().mockImplementation((key, defaultValue) => {
    // Return different values based on the localStorage key
    if (key.includes('START_LOCAL_STORAGE_KEY')) {
      return ['now-24h', jest.fn()];
    }
    if (key.includes('END_LOCAL_STORAGE_KEY')) {
      return ['now', jest.fn()];
    }
    if (key.includes('CONNECTOR_ID_LOCAL_STORAGE_KEY')) {
      return ['test-id', jest.fn()];
    }
    // For other keys, return the default value or 'test-id'
    return [defaultValue || 'test-id', jest.fn()];
  })
);

jest.mock('react-use/lib/useSessionStorage', () =>
  jest.fn().mockReturnValue([undefined, jest.fn()])
);

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: jest.fn(() => mockFindAnonymizationFieldsResponse),
  })
);

jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => ({
    isFetched: true,
    data: mockConnectors,
  })),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/connectorland/connector_selector_inline/connector_selector_inline',
  () => ({
    ConnectorSelectorInline: () => null,
  })
);

const mockSecurityCapabilities = [SECURITY_UI_SHOW_PRIVILEGE];

jest.mock('../../common/links', () => ({
  useLinkInfo: () =>
    jest.fn().mockReturnValue({
      capabilities: mockSecurityCapabilities,
      globalNavPosition: 4,
      globalSearchKeywords: ['Attack discovery'],
      id: 'attack_discovery',
      path: '/attack_discovery',
      title: 'Attack discovery',
    }),
}));

jest.mock('./use_attack_discovery', () => ({
  useAttackDiscovery: jest.fn().mockReturnValue({
    fetchAttackDiscoveries: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('./moving_attacks_callout/use_moving_attacks_callout');
const useMovingAttacksCalloutMock = useMovingAttacksCallout as jest.Mock;

const mockFilterManager = createFilterManagerMock();

const mockDataViewsService = dataViewPluginMocks.createStartContract();

const mockUpselling = new UpsellingService();

const mockUseKibanaReturnValue = {
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
      getBooleanValue: jest.fn().mockReturnValue(false),
    },
    lens: {
      EmbeddableComponent: () => null,
    },
    notifications: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    sessionView: {
      getSessionView: jest.fn(() => <div />),
    },
    storage: {
      get: jest.fn(),
      set: jest.fn(),
    },
    theme: {
      getTheme: jest.fn().mockReturnValue({ darkMode: false }),
    },
    timelines: { ...mockTimelines },
    triggersActionsUi: {
      alertsTableConfigurationRegistry: {},
      getAlertsStateTable: () => <></>,
    },
    uiSettings: {
      get: jest.fn(),
    },
    unifiedSearch: {
      ui: {
        SearchBar: () => null,
      },
    },
  },
};
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => mockUseKibanaReturnValue,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addInfo: jest.fn(),
      remove: jest.fn(),
    }),
    useUiSetting$: jest.fn().mockReturnValue([]),
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
    jest.clearAllMocks();

    (useLoadConnectors as jest.Mock).mockReturnValue({
      isFetched: true,
      data: mockConnectors,
    });

    useMovingAttacksCalloutMock.mockReturnValue(mockUseMovingAttacksCallout());
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
    let fetchAttackDiscoveriesMock: jest.Mock;
    beforeEach(() => {
      fetchAttackDiscoveriesMock = jest.fn();
      (useAttackDiscovery as jest.Mock).mockReturnValue({
        fetchAttackDiscoveries: fetchAttackDiscoveriesMock,
        isLoading: false,
      });

      // Override the localStorage mock to return proper values for this test
      (useLocalStorage as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('attackDiscovery.start')) {
          return ['now-24h', jest.fn()];
        }
        if (key.includes('attackDiscovery.end')) {
          return ['now', jest.fn()];
        }
        if (key.includes('attackDiscovery.connectorId')) {
          return ['test-id', jest.fn()];
        }
        return [undefined, jest.fn()];
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

  describe('`enableAlertsAndAttacksAlignment` feature', () => {
    it('renders callout about new Attacks page when feature is enabled', () => {
      mockUseKibanaReturnValue.services.uiSettings.get.mockImplementation((key) => {
        if (key === ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING) {
          return true;
        }
        return false;
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

      expect(screen.getByTestId(CALLOUT_TEST_DATA_ID)).toBeInTheDocument();
    });

    it('does not render callout about new Attacks page when feature is disabled', () => {
      mockUseKibanaReturnValue.services.uiSettings.get.mockImplementation((key) => {
        if (key === ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING) {
          return false;
        }
        return false;
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

      expect(screen.queryByTestId(CALLOUT_TEST_DATA_ID)).not.toBeInTheDocument();
    });
  });
});
