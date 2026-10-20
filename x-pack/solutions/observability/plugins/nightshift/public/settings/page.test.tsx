/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AppHeaderTab } from '@kbn/app-header';
import { createMemoryHistory } from 'history';
import { I18nProvider } from '@kbn/i18n-react';
import { Route, Router } from '@kbn/shared-ux-router';
import { useKibana } from '../hooks/use_kibana';
import { useAppsEnabled } from './hooks/use_apps_enabled';
import { SettingsPage } from './page';

jest.mock('../hooks/use_kibana');
jest.mock('./hooks/use_apps_enabled');
jest.mock('../app/app_header', () => ({
  NightshiftAppHeader: ({ tabs }: { tabs: AppHeaderTab[] }) => (
    <div>
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          onClick={tab.onClick}
          data-test-subj={tab['data-test-subj']}
          data-selected={tab.isSelected}
        >
          {tab.label}
        </a>
      ))}
    </div>
  ),
}));
jest.mock('./general_settings_tab', () => ({
  GeneralSettingsTab: () => <div data-test-subj="general-settings-content" />,
}));
jest.mock('./investigations_settings_tab', () => ({
  InvestigationsSettingsTab: () => <div data-test-subj="investigations-settings-content" />,
}));
jest.mock('./detections_settings_tab', () => ({
  DetectionsSettingsTab: () => <div data-test-subj="detections-settings-content" />,
}));

const mockUseAppsEnabled = useAppsEnabled as jest.MockedFunction<typeof useAppsEnabled>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const headerProps = {
  onManagementClick: jest.fn(),
  managementHref: '/app/significant_events/streams',
};

const renderPage = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  const result = render(
    <I18nProvider>
      <Router history={history}>
        <Route
          path="/settings/:tab?"
          component={() => <SettingsPage headerProps={headerProps} />}
        />
      </Router>
    </I18nProvider>
  );

  return { ...result, history };
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppsEnabled.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: (_appId: string, { path }: { path: string }) => `/app/nightshift${path}`,
          capabilities: { nightshift: { manage: true } },
        },
      },
    } as never);
  });

  it.each([
    ['general', 'general-settings-content'],
    ['investigations', 'investigations-settings-content'],
    ['detections', 'detections-settings-content'],
  ])('renders the %s tab selected from the URL', (tab, testSubject) => {
    renderPage(`/settings/${tab}`);

    expect(screen.getByTestId(testSubject)).toBeInTheDocument();
    expect(screen.getByTestId(`nightshiftSettingsTab-${tab}`)).toHaveAttribute(
      'data-selected',
      'true'
    );
  });

  it('redirects the base route to General when Apps is enabled', async () => {
    const { history } = renderPage('/settings');

    await waitFor(() => expect(history.location.pathname).toBe('/settings/general'));
  });

  it('redirects an unknown tab to the default tab', async () => {
    const { history } = renderPage('/settings/unknown');

    await waitFor(() => expect(history.location.pathname).toBe('/settings/general'));
  });

  it('waits for the Apps flag before validating the tab', () => {
    mockUseAppsEnabled.mockReturnValue(undefined);

    const { history } = renderPage('/settings');

    expect(history.location.pathname).toBe('/settings');
    expect(screen.queryByTestId('general-settings-content')).not.toBeInTheDocument();
  });

  it('hides General and redirects it to Detections when Apps is disabled', async () => {
    mockUseAppsEnabled.mockReturnValue(false);

    const { history } = renderPage('/settings/general');

    await waitFor(() => expect(history.location.pathname).toBe('/settings/detections'));
    expect(screen.queryByTestId('nightshiftSettingsTab-general')).not.toBeInTheDocument();
    expect(screen.getByTestId('detections-settings-content')).toBeInTheDocument();
  });

  it('uses in-app navigation when switching tabs', () => {
    const { history } = renderPage('/settings/general');

    fireEvent.click(screen.getByTestId('nightshiftSettingsTab-investigations'));

    expect(history.location.pathname).toBe('/settings/investigations');
  });
});
