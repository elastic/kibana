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
import { NightshiftPage } from './nightshift';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { OVERVIEW_PATH } from '../../../common/locators/paths';

const mockReplace = jest.fn();

jest.mock('react-router-dom', () => ({ useHistory: () => ({ replace: mockReplace }) }));
jest.mock('@kbn/observability-shared-plugin/public', () => ({ useBreadcrumbs: jest.fn() }));
jest.mock('./app/nightshift_app', () => ({
  NightshiftApp: () => <div data-test-subj="nightshiftAppStub" />,
}));
jest.mock('../../utils/kibana_react', () => ({ useKibana: jest.fn() }));
jest.mock('../../hooks/use_plugin_context', () => ({ usePluginContext: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;
const mockUsePluginContext = usePluginContext as jest.Mock;

const getBooleanValue = jest.fn();
const getUrlForApp = jest.fn((appId: string, { path }: { path: string }) => `/app/${appId}${path}`);
const navigateToUrl = jest.fn();

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
    mockReplace.mockClear();
    navigateToUrl.mockClear();
    getBooleanValue.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        application: { getUrlForApp, navigateToUrl },
        http: { basePath: { prepend: (path: string) => path } },
        featureFlags: { getBooleanValue },
        serverless: undefined,
      },
    });
    mockUsePluginContext.mockReturnValue({
      ObservabilityPageTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    });
  });

  it('redirects to the overview when the availability flag is disabled', () => {
    getBooleanValue.mockReturnValue(false);
    renderPage();
    expect(mockReplace).toHaveBeenCalledWith(OVERVIEW_PATH);
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('renders the app when the availability flag is enabled', async () => {
    renderPage();
    expect(mockReplace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Nightshift')
    );
    expect(screen.getByTestId('nightshiftAppStub')).toBeInTheDocument();
  });

  it('links to Streams settings with EBT tracking', async () => {
    renderPage();
    await openAppMenuOverflow();

    const settingsLink = await screen.findByTestId('nightshiftSettingsLink');
    expect(settingsLink).toHaveAttribute('href', '/app/streams/_discovery/settings');

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
    expect(navigateToUrl).toHaveBeenCalledWith('/app/streams/_discovery/settings');
  });
});
