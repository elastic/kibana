/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { OBSERVABILITY_OVERVIEW_APP_ID } from '@kbn/deeplinks-observability';
import { NightshiftPage } from './nightshift_page';
import { useKibana } from './hooks/use_kibana';

jest.mock('@kbn/observability-shared-plugin/public', () => ({ useBreadcrumbs: jest.fn() }));
jest.mock('./app/app', () => ({
  NightshiftApp: () => <div data-test-subj="nightshiftAppStub" />,
}));
jest.mock('./hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const getBooleanValue = jest.fn();
/** Mirrors the registered `appRoute` for significantEvents (`/app/significant_events`). */
const getUrlForApp = jest.fn((appId: string, { path }: { path: string }) => {
  const base = appId === 'significantEvents' ? '/app/significant_events' : `/app/${appId}`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
});
const navigateToUrl = jest.fn();
const navigateToApp = jest.fn();

function renderPage() {
  return render(
    <I18nProvider>
      <MockAppHeaderProvider>
        <NightshiftPage />
      </MockAppHeaderProvider>
    </I18nProvider>
  );
}

describe('NightshiftPage', () => {
  beforeEach(() => {
    navigateToApp.mockClear();
    navigateToUrl.mockClear();
    getBooleanValue.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        application: { getUrlForApp, navigateToUrl, navigateToApp },
        http: { basePath: { prepend: (path: string) => path } },
        featureFlags: { getBooleanValue },
        serverless: undefined,
        observabilityShared: {
          navigation: {
            PageTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
          },
        },
      },
    });
  });

  it('redirects to the overview when the availability flag is disabled', () => {
    getBooleanValue.mockReturnValue(false);
    renderPage();
    expect(navigateToApp).toHaveBeenCalledWith(OBSERVABILITY_OVERVIEW_APP_ID);
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('renders the app when the availability flag is enabled', async () => {
    renderPage();
    expect(navigateToApp).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Nightshift')
    );
    expect(screen.getByTestId('nightshiftAppStub')).toBeInTheDocument();
  });

  it('links to Streams settings with EBT tracking', async () => {
    renderPage();
    await openAppMenuOverflow();

    const settingsLink = await screen.findByTestId('nightshiftSettingsLink');
    expect(settingsLink).toHaveAttribute('href', '/app/significant_events/settings');

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
    expect(navigateToUrl).toHaveBeenCalledWith('/app/significant_events/settings');
  });
});
