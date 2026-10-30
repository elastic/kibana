/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
import { NightshiftPage } from './nightshift_page';
import { Router } from '@kbn/shared-ux-router';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './data/availability/use_significant_events_availability';
import { useOnboardingVisibility } from './onboarding/use_onboarding_visibility';
import type { NightshiftAppHeaderProps } from './components/app_header';

jest.mock('@kbn/observability-shared-plugin/public', () => ({ useBreadcrumbs: jest.fn() }));
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useCurrentEuiBreakpoint: () => 'xl',
}));
jest.mock('./app/app', () => ({
  NightshiftApp: () => <div data-test-subj="nightshiftAppStub" />,
}));
jest.mock('./automations/automations_page', () => ({
  AutomationsPage: () => <div data-test-subj="automationsPageStub" />,
}));
jest.mock('./onboarding/onboarding', () => ({
  NightshiftOnboarding: () => <div data-test-subj="nightshiftOnboardingStub" />,
}));
jest.mock('./onboarding/use_onboarding_visibility');
jest.mock('./knowledge/page', () => {
  const { NightshiftAppHeader } = jest.requireActual('./components/app_header');
  return {
    KnowledgePage: ({ headerProps }: { headerProps: NightshiftAppHeaderProps }) => (
      <>
        <NightshiftAppHeader {...headerProps} page="knowledge" />
        <div data-test-subj="knowledgePageStub" />
      </>
    ),
  };
});
jest.mock('./sources/page', () => {
  const { NightshiftAppHeader } = jest.requireActual('./components/app_header');
  return {
    SourcesPage: ({ headerProps }: { headerProps: NightshiftAppHeaderProps }) => (
      <>
        <NightshiftAppHeader {...headerProps} page="sources" />
        <div data-test-subj="sourcesPageStub" />
      </>
    ),
  };
});
jest.mock('./pages/detection/page', () => {
  const { NightshiftAppHeader } = jest.requireActual('./components/app_header');
  return {
    DetectionPage: ({ headerProps }: { headerProps: NightshiftAppHeaderProps }) => (
      <>
        <NightshiftAppHeader {...headerProps} page="detection" />
        <div data-test-subj="detectionPageStub" />
      </>
    ),
  };
});
jest.mock('./settings/page', () => ({
  SettingsPage: ({ headerProps }: { headerProps: { onCustomContextClick?: () => void } }) => {
    const [draft, setDraft] = React.useState('');

    return (
      <div data-test-subj="settingsPageStub">
        <input
          data-test-subj="settingsPageDraftStub"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          data-test-subj="settingsPageOpenCustomContextStub"
          onClick={headerProps.onCustomContextClick}
        >
          Open custom context
        </button>
      </div>
    );
  },
}));
jest.mock('./components/start_investigation_panel', () => ({
  StartInvestigationPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="startInvestigationPanelStub">
      <button onClick={onClose} type="button">
        Close start investigation
      </button>
    </div>
  ),
}));
jest.mock('./hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('./hooks/use_developer_mode', () => ({
  useDeveloperMode: () => ({
    isDeveloperMode: false,
    isSaving: false,
    setDeveloperMode: jest.fn(),
  }),
}));
jest.mock('./data/availability/use_significant_events_availability');
let mockServiceAccount: { isLoading: boolean; isSuccess: boolean; data?: Record<string, unknown> };
jest.mock('./service_account/use_investigator_service_account', () => ({
  ...jest.requireActual('./service_account/use_investigator_service_account'),
  useInvestigatorServiceAccount: () => mockServiceAccount,
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseSignificantEventsAvailability = useSignificantEventsAvailability as jest.Mock;
const mockUseOnboardingVisibility = useOnboardingVisibility as jest.Mock;
const getUrlForApp = jest.fn(
  (appId: string, { path }: { path: string }) =>
    `/app/${appId}${path.startsWith('/') ? path : `/${path}`}`
);
const navigateToUrl = jest.fn();
const navigateToApp = jest.fn();
const featureFlags = { useBooleanValue: jest.fn() };

function renderPage(initialPath = '/') {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const renderResult = render(
    <I18nProvider>
      <MockAppHeaderProvider>
        <Router history={history}>
          <NightshiftPage />
        </Router>
      </MockAppHeaderProvider>
    </I18nProvider>
  );
  return { ...renderResult, history };
}

describe('NightshiftPage', () => {
  beforeEach(() => {
    navigateToApp.mockClear();
    navigateToUrl.mockClear();
    featureFlags.useBooleanValue.mockReturnValue(true);
    mockServiceAccount = {
      isLoading: false,
      isSuccess: true,
      data: { installed: true, enabled: true, bound: true, serviceAccountsEnabled: true },
    };
    mockUseSignificantEventsAvailability.mockReturnValue({ isAvailable: true, isLoading: false });
    mockUseOnboardingVisibility.mockReturnValue({
      isLoading: false,
      showOnboarding: false,
      dismiss: jest.fn(),
    });
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp,
          navigateToUrl,
          navigateToApp,
          capabilities: {
            nightshift: {
              [NIGHTSHIFT_UI_PRIVILEGES.show]: true,
              [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
              [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
            },
          },
        },
        featureFlags,
        http: { basePath: { prepend: (path: string) => path } },
        serverless: undefined,
        observabilityShared: {
          navigation: {
            PageTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
          },
        },
      },
    });
  });

  describe('service account setup', () => {
    const withInvestigations = () => {
      const { services } = mockUseKibana();
      mockUseKibana.mockReturnValue({
        services: {
          ...services,
          nightshiftInvestigations: { investigationsClient: { fetch: jest.fn() } },
        },
      });
    };

    it('shows the setup step instead of the app until the space is set up', () => {
      withInvestigations();
      mockServiceAccount = {
        isLoading: false,
        isSuccess: true,
        data: { installed: false, enabled: null, serviceAccountsEnabled: true },
      };
      renderPage();

      expect(screen.getByTestId('nightshiftOnboardingStub')).toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
    });

    it('shows the app once the space is set up', () => {
      withInvestigations();
      renderPage();

      expect(screen.queryByTestId('nightshiftOnboardingStub')).not.toBeInTheDocument();
      expect(screen.getByTestId('nightshiftAppStub')).toBeInTheDocument();
    });

    it('does not block the app when the setup status cannot be read', () => {
      withInvestigations();
      mockServiceAccount = { isLoading: false, isSuccess: false };
      renderPage();

      expect(screen.getByTestId('nightshiftAppStub')).toBeInTheDocument();
    });
  });

  describe('Investigate action', () => {
    const withInvestigationsClient = (capabilities: Record<string, boolean>) => {
      const { services } = mockUseKibana();
      mockUseKibana.mockReturnValue({
        services: {
          ...services,
          nightshiftInvestigations: { investigationsClient: { fetch: jest.fn() } },
          application: {
            ...services.application,
            capabilities: { nightshift: capabilities },
          },
        },
      });
    };

    it('opens and closes the start investigation modal from the header primary action', async () => {
      withInvestigationsClient({
        [NIGHTSHIFT_UI_PRIVILEGES.show]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
      });
      renderPage();

      const investigateButton = await screen.findByTestId(
        'o11yNightshiftAppStartInvestigationButton'
      );
      expect(investigateButton).toHaveTextContent('Investigate');
      expect(screen.queryByTestId('startInvestigationPanelStub')).not.toBeInTheDocument();

      await act(async () => fireEvent.click(investigateButton));
      expect(screen.getByTestId('startInvestigationPanelStub')).toBeInTheDocument();

      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Close start investigation' }))
      );
      expect(screen.queryByTestId('startInvestigationPanelStub')).not.toBeInTheDocument();
    });

    it('hides the action without the Nightshift manage privilege', async () => {
      withInvestigationsClient({ [NIGHTSHIFT_UI_PRIVILEGES.show]: true });
      renderPage();

      await screen.findByTestId('nightshiftAppStub');
      expect(
        screen.queryByTestId('o11yNightshiftAppStartInvestigationButton')
      ).not.toBeInTheDocument();
    });

    it('hides the action when the investigations client is unavailable', async () => {
      renderPage();

      await screen.findByTestId('nightshiftAppStub');
      expect(
        screen.queryByTestId('o11yNightshiftAppStartInvestigationButton')
      ).not.toBeInTheDocument();
    });
  });

  it('redirects to the overview when significant events are unavailable', () => {
    mockUseSignificantEventsAvailability.mockReturnValue({ isAvailable: false, isLoading: false });
    renderPage();
    expect(navigateToApp).toHaveBeenCalledWith(OBSERVABILITY_OVERVIEW_APP_ID);
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('waits for the availability response before redirecting', () => {
    mockUseSignificantEventsAvailability.mockReturnValue({ isAvailable: false, isLoading: true });
    renderPage();
    expect(navigateToApp).not.toHaveBeenCalled();
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('renders the app when significant events are available', async () => {
    renderPage();
    expect(navigateToApp).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Nightshift')
    );
    expect(screen.getByTestId('nightshiftAppStub')).toBeInTheDocument();
  });

  it('hides the settings link without both Nightshift manage and configure', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp,
          navigateToUrl,
          navigateToApp,
          capabilities: {
            nightshift: {
              [NIGHTSHIFT_UI_PRIVILEGES.show]: true,
              [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
            },
          },
        },
        featureFlags,
        http: { basePath: { prepend: (path: string) => path } },
        serverless: undefined,
        observabilityShared: {
          navigation: {
            PageTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
          },
        },
      },
    });

    renderPage();
    await openAppMenuOverflow();

    expect(screen.queryByTestId('nightshiftSettingsLink')).not.toBeInTheDocument();
  });

  it('links to Nightshift settings with EBT tracking', async () => {
    renderPage();
    await openAppMenuOverflow();

    const settingsLink = await screen.findByTestId('nightshiftSettingsLink');
    expect(settingsLink).toHaveAttribute('href', '/app/nightshift/settings');

    let trackedClick: { action: string | null; element: string | null } | undefined;
    const captureTrackedClick = (event: MouseEvent) => {
      const target = event.target;
      const trackedTarget = target instanceof Element ? target.closest('[data-ebt-action]') : null;
      trackedClick = trackedTarget
        ? {
            action: trackedTarget.getAttribute('data-ebt-action'),
            element: trackedTarget.getAttribute('data-ebt-element'),
          }
        : undefined;
    };
    document.addEventListener('click', captureTrackedClick);
    await act(async () => fireEvent.click(settingsLink));
    document.removeEventListener('click', captureTrackedClick);

    await waitFor(() =>
      expect(trackedClick).toEqual({
        action: 'viewSettings',
        element: 'nightshiftPageHeader',
      })
    );
    expect(navigateToUrl).toHaveBeenCalledWith('/app/nightshift/settings');
  });

  it('renders Settings inside Nightshift', () => {
    renderPage('/settings/detections');

    expect(screen.getByTestId('settingsPageStub')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  describe('Knowledge', () => {
    it('links to Knowledge without requesting optional-tab availability', async () => {
      renderPage();
      await openAppMenuOverflow();

      const knowledgeLink = await screen.findByTestId('nightshiftKnowledgeLink');
      expect(knowledgeLink).toHaveAttribute('href', '/app/nightshift/knowledge');

      await act(async () => fireEvent.click(knowledgeLink));
      expect(navigateToUrl).toHaveBeenCalledWith('/app/nightshift/knowledge');
    });

    it('renders the lazy page at /knowledge', async () => {
      renderPage('/knowledge/cortex');

      expect(await screen.findByTestId('knowledgePageStub')).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Knowledge');
    });
  });

  describe('Sources', () => {
    it.each(['/sources', '/sources/new', '/sources/source-1'])(
      'renders the lazy Sources page at %s',
      async (path) => {
        renderPage(path);

        expect(await screen.findByTestId('sourcesPageStub')).toBeInTheDocument();
        expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Sources');
        expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
      }
    );
  });

  it.each(['/detections', '/detections/unknown'])(
    'redirects %s to the Events tab',
    async (path) => {
      const { history } = renderPage(path);

      expect(await screen.findByTestId('detectionPageStub')).toBeInTheDocument();
      expect(history.location.pathname).toBe('/detections/events');
    }
  );

  it('redirects Signals to Events with the current params outside developer mode', async () => {
    const { history } = renderPage('/detections/signals?entity=checkout&signalsSearch=latency');

    expect(await screen.findByTestId('detectionPageStub')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/detections/events');
    expect(history.location.search).toBe('?entity=checkout&signalsSearch=latency');
  });

  it('shows the Detections header actions and marks Detections as the Settings origin', async () => {
    renderPage('/detections/events');

    expect(await screen.findByTestId('detectionPageStub')).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Detections');
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();

    await openAppMenuOverflow();
    const knowledgeLink = await screen.findByTestId('nightshiftKnowledgeLink');
    expect(knowledgeLink).toHaveAttribute('href', '/app/nightshift/knowledge');
    expect(screen.getAllByRole('menuitem')[0]).toBe(knowledgeLink);

    await act(async () => fireEvent.click(knowledgeLink));
    expect(navigateToUrl).toHaveBeenCalledWith('/app/nightshift/knowledge');

    const sourcesLink = screen.getByTestId('nightshiftSourcesLink');
    expect(sourcesLink).toBeVisible();
    expect(sourcesLink).toHaveAttribute('href', '/app/nightshift/sources');

    await act(async () => fireEvent.click(sourcesLink));
    expect(navigateToUrl).toHaveBeenCalledWith('/app/nightshift/sources');

    const settingsLink = screen.getByTestId('nightshiftSettingsLink');
    expect(settingsLink).toBeVisible();
    expect(settingsLink).toHaveAttribute(
      'href',
      '/app/nightshift/settings/detections?origin=detections'
    );
    expect(screen.queryByTestId('nightshiftAutomationsPrimaryAction')).not.toBeInTheDocument();

    await act(async () => fireEvent.click(settingsLink));
    expect(navigateToUrl).toHaveBeenLastCalledWith(
      '/app/nightshift/settings/detections?origin=detections'
    );
  });

  describe('app menu', () => {
    const withServices = (overrides: Record<string, unknown>) => {
      const { services } = mockUseKibana();
      mockUseKibana.mockReturnValue({
        services: {
          ...services,
          ...overrides,
          application: {
            ...services.application,
            capabilities: {
              nightshift: {
                ...services.application.capabilities.nightshift,
                manage: true,
              },
            },
          },
        },
      });
    };

    it('shows the Automations button when the API and feature flag are available', async () => {
      withServices({ nightshiftInvestigations: { investigationsClient: { fetch: jest.fn() } } });
      renderPage();

      expect(await screen.findByTestId('nightshiftAutomationsPrimaryAction')).toHaveAttribute(
        'href',
        '/app/nightshift/automations'
      );
    });

    it('shows the automations list as its own page at /automations', async () => {
      withServices({ nightshiftInvestigations: { investigationsClient: { fetch: jest.fn() } } });
      renderPage('/automations');

      expect(await screen.findByTestId('automationsPageStub')).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Automations');
      expect(screen.queryByTestId('nightshiftTabAutomations')).not.toBeInTheDocument();
    });

    it('keeps the automations page mounted for a detail route', async () => {
      withServices({ nightshiftInvestigations: { investigationsClient: { fetch: jest.fn() } } });
      renderPage('/automations/automation-1');

      expect(await screen.findByTestId('automationsPageStub')).toBeInTheDocument();
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Automations');
    });
  });

  describe('onboarding', () => {
    const withInvestigationsClient = () => {
      const { services } = mockUseKibana();
      mockUseKibana.mockReturnValue({
        services: { ...services, nightshiftInvestigations: { investigationsClient: {} } },
      });
    };

    it('renders onboarding instead of the landing page while the space onboards', async () => {
      withInvestigationsClient();
      mockUseOnboardingVisibility.mockReturnValue({
        isLoading: false,
        showOnboarding: true,
        dismiss: jest.fn(),
      });
      renderPage();

      expect(await screen.findByTestId('nightshiftOnboardingStub')).toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
      expect(mockUseOnboardingVisibility).toHaveBeenCalledWith(
        expect.objectContaining({
          isEnabled: true,
          canUseAutomations: true,
          forceOnboarding: false,
        })
      );
    });

    it('hides the Investigations action before the first investigation', async () => {
      withInvestigationsClient();
      mockUseOnboardingVisibility.mockReturnValue({
        isLoading: false,
        showOnboarding: true,
        dismiss: jest.fn(),
      });
      renderPage();

      await screen.findByTestId('nightshiftOnboardingStub');
      expect(screen.queryByTestId('nightshiftInvestigationsPrimaryAction')).not.toBeInTheDocument();
    });

    it.each([
      ['/sources', 'sourcesPageStub'],
      ['/sources/new', 'sourcesPageStub'],
      ['/knowledge/knowledge_indicators', 'knowledgePageStub'],
      ['/settings/detections', 'settingsPageStub'],
    ])('keeps %s accessible while onboarding is active', async (path, pageTestSubject) => {
      withInvestigationsClient();
      mockUseOnboardingVisibility.mockReturnValue({
        isLoading: false,
        showOnboarding: true,
        dismiss: jest.fn(),
      });
      renderPage(path);

      expect(await screen.findByTestId(pageTestSubject)).toBeInTheDocument();
      expect(screen.queryByTestId('nightshiftOnboardingStub')).not.toBeInTheDocument();
    });

    it('forces onboarding with ?onboarding=1', async () => {
      withInvestigationsClient();
      renderPage('/?onboarding=1');

      await screen.findByTestId('nightshiftAppStub');
      expect(mockUseOnboardingVisibility).toHaveBeenCalledWith(
        expect.objectContaining({ forceOnboarding: true })
      );
    });
  });
});
