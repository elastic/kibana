/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { NightshiftPage } from './nightshift';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchSignificantEventsAvailability } from './hooks/use_fetch_significant_events_availability';
import { OVERVIEW_PATH } from '../../../common/locators/paths';

const mockReplace = jest.fn();

jest.mock('react-router-dom', () => ({ useHistory: () => ({ replace: mockReplace }) }));
jest.mock('@kbn/observability-shared-plugin/public', () => ({ useBreadcrumbs: jest.fn() }));
jest.mock('./components/nightshift_app', () => ({
  NightshiftApp: () => <div data-test-subj="nightshiftAppStub" />,
}));
jest.mock('../../utils/kibana_react', () => ({ useKibana: jest.fn() }));
jest.mock('../../hooks/use_plugin_context', () => ({ usePluginContext: jest.fn() }));
jest.mock('./hooks/use_fetch_significant_events_availability', () => ({
  useFetchSignificantEventsAvailability: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUsePluginContext = usePluginContext as jest.Mock;
const mockUseAvailability = useFetchSignificantEventsAvailability as jest.Mock;

const getBooleanValue = jest.fn();

function renderPage() {
  return render(
    <I18nProvider>
      <NightshiftPage />
    </I18nProvider>
  );
}

describe('NightshiftPage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    getBooleanValue.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        http: { basePath: { prepend: (path: string) => path } },
        featureFlags: { getBooleanValue },
        serverless: undefined,
      },
    });
    mockUsePluginContext.mockReturnValue({
      ObservabilityPageTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    });
    mockUseAvailability.mockReturnValue({
      data: { available: true },
      error: null,
      isLoading: false,
      isFetching: false,
    });
  });

  it('redirects to the overview when the availability flag is disabled', () => {
    getBooleanValue.mockReturnValue(false);
    renderPage();
    expect(mockReplace).toHaveBeenCalledWith(OVERVIEW_PATH);
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('renders the app when the availability flag is enabled and significant events is available', () => {
    renderPage();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('nightshiftAppStub')).toBeInTheDocument();
  });

  it('waits (renders nothing, no redirect) while availability is resolving', () => {
    mockUseAvailability.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isFetching: true,
    });
    renderPage();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('redirects when significant events is unavailable', () => {
    mockUseAvailability.mockReturnValue({
      data: { available: false, reason: 'feature_flag' },
      error: null,
      isLoading: false,
      isFetching: false,
    });
    renderPage();
    expect(mockReplace).toHaveBeenCalledWith(OVERVIEW_PATH);
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });

  it('redirects when the availability check fails', () => {
    mockUseAvailability.mockReturnValue({
      data: undefined,
      error: new Error('boom'),
      isLoading: false,
      isFetching: false,
    });
    renderPage();
    expect(mockReplace).toHaveBeenCalledWith(OVERVIEW_PATH);
    expect(screen.queryByTestId('nightshiftAppStub')).not.toBeInTheDocument();
  });
});
