/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { useKibana } from '../../hooks/use_kibana';
import { useSignificantEventsAppParams } from '../../hooks/use_significant_events_app_params';
import { useSignificantEventsAvailability } from '../../hooks/use_significant_events_availability';
import { SettingsPage } from './page';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_significant_events_availability');
jest.mock('../../hooks/use_significant_events_app_params', () => ({
  useSignificantEventsAppParams: jest.fn(),
}));
jest.mock('../../hooks/use_significant_events_app_router', () => ({
  useSignificantEventsAppRouter: () => ({
    link: (_path: string, params: { path: { tab: string } }) =>
      `/app/significant_events/${params.path.tab}`,
  }),
}));
jest.mock('../../components/page_template', () => ({
  SignificantEventsAppHeader: ({ back }: { back: { href: string; label: string } }) => (
    <a data-test-subj="settingsPageBackLink" href={back.href}>
      {back.label}
    </a>
  ),
  SignificantEventsAppLoading: () => null,
  SignificantEventsAppPageTemplate: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));
jest.mock('../significant_events/components/settings/tab', () => ({
  SettingsTab: () => null,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSignificantEventsAvailability =
  useSignificantEventsAvailability as jest.MockedFunction<typeof useSignificantEventsAvailability>;
const mockUseSignificantEventsAppParams = useSignificantEventsAppParams as jest.MockedFunction<
  typeof useSignificantEventsAppParams
>;

const getUrlForApp = jest.fn().mockReturnValue('/app/nightshift');
const navigateToApp = jest.fn();
const setBreadcrumbs = jest.fn();

const setCapabilities = ({
  canConfigure,
  canManage,
}: {
  canConfigure: boolean;
  canManage: boolean;
}) => {
  mockUseKibana.mockReturnValue({
    core: {
      application: {
        capabilities: { nightshift: { configure: canConfigure, manage: canManage } },
        getUrlForApp,
        navigateToApp,
      },
      chrome: { setBreadcrumbs },
    },
  } as never);
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCapabilities({ canConfigure: true, canManage: true });
    mockUseSignificantEventsAppParams.mockReturnValue({ query: {} } as never);
    mockUseSignificantEventsAvailability.mockReturnValue({
      availability: { available: true },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSignificantEventsAvailability>);
  });

  it('redirects users without manage and configure permission to Nightshift', async () => {
    setCapabilities({ canConfigure: true, canManage: false });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(navigateToApp).toHaveBeenCalledWith(NIGHTSHIFT_APP_ID);
    });
  });

  it('returns to the management tab when fromTab is a known tab', () => {
    mockUseSignificantEventsAppParams.mockReturnValue({ query: { fromTab: 'sources' } } as never);

    render(<SettingsPage />);

    expect(screen.getByTestId('settingsPageBackLink')).toHaveAttribute(
      'href',
      '/app/significant_events/sources'
    );
    expect(screen.getByTestId('settingsPageBackLink')).toHaveTextContent('Nightshift Management');
  });

  it('returns to Nightshift when fromTab is absent', () => {
    render(<SettingsPage />);

    expect(screen.getByTestId('settingsPageBackLink')).toHaveAttribute('href', '/app/nightshift');
    expect(screen.getByTestId('settingsPageBackLink')).toHaveTextContent(/^Nightshift$/);
  });

  it('returns to Nightshift when fromTab is not a tab', () => {
    mockUseSignificantEventsAppParams.mockReturnValue({ query: { fromTab: 'streams' } } as never);

    render(<SettingsPage />);

    expect(screen.getByTestId('settingsPageBackLink')).toHaveAttribute('href', '/app/nightshift');
    expect(screen.getByTestId('settingsPageBackLink')).toHaveTextContent(/^Nightshift$/);
  });
});
