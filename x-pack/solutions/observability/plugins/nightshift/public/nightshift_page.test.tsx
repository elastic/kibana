/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
import { NightshiftPage } from './nightshift_page';
import { Router } from '@kbn/shared-ux-router';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './hooks/use_significant_events_availability';
import { useOnboardingVisibility } from './onboarding/use_onboarding_visibility';
import type { NightshiftAppHeaderProps } from './app/app_header';

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
jest.mock('./sources/page', () => {
  const { NightshiftAppHeader } = jest.requireActual('./app/app_header');
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
  const { NightshiftAppHeader } = jest.requireActual('./app/app_header');
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
jest.mock('./hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('./hooks/use_developer_mode', () => ({
  useDeveloperMode: () => ({
    isDeveloperMode: false,
    isSaving: false,
    setDeveloperMode: jest.fn(),
  }),
}));
jest.mock('./hooks/use_significant_events_availability');

const mockUseKibana = useKibana as jest.Mock;
const mockUseSignificantEventsAvailability = useSignificantEventsAvailability as jest.Mock;
const mockUseOnboardingVisibility = useOnboardingVisibility as jest.Mock;
/** Mirrors the registered `appRoute` for significantEvents (`/app/significant_events`). */
const getUrlForApp = jest.fn((appId: string, { path }: { path: string }) => {
  const base = appId === 'significantEvents' ? '/app/significant_events' : `/app/${appId}`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
});
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
    featureFlags.useBooleanValue.mockReturnValue(true);
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

  it.each(['/detections/unknown'])('redirects %s to the Events tab', async (path) => {
    const { history } = renderPage(path);

    expect(await screen.findByTestId('detectionPageStub')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/detections/events');
  });

  it('redirects Signals to Events with the current params outside developer mode', async () => {
    const { history } = renderPage('/detections/signals?entity=checkout&signalsSearch=latency');

    expect(await screen.findByTestId('detectionPageStub')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/detections/events');
    expect(history.location.search).toBe('?entity=checkout&signalsSearch=latency');
  });

  describe('onboarding', () => {
    const withInvestigationsClient = () => {
      const { services } = mockUseKibana();
      mockUseKibana.mockReturnValue({
        services: { ...services, nightshiftInvestigations: { investigationsClient: {} } },
      });
    };

    it.each([['/sources', 'sourcesPageStub']])(
      'keeps %s accessible while onboarding is active',
      async (path, pageTestSubject) => {
        withInvestigationsClient();
        mockUseOnboardingVisibility.mockReturnValue({
          isLoading: false,
          showOnboarding: true,
          dismiss: jest.fn(),
        });
        renderPage(path);

        expect(await screen.findByTestId(pageTestSubject)).toBeInTheDocument();
        expect(screen.queryByTestId('nightshiftOnboardingStub')).not.toBeInTheDocument();
      }
    );
  });
});
