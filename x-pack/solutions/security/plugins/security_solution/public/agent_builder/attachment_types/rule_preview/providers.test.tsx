/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RulePreviewAttachmentSecurityProviders } from './providers';

jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../flyout', () => ({
  SecuritySolutionFlyout: () => null,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useDarkMode: () => false,
}));

jest.mock('@kbn/kibana-react-plugin/common', () => ({
  EuiThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../data_view_manager/hooks/use_init_data_view_manager', () => ({
  useInitDataViewManager: () => jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

const renderProviders = (getServices: () => Promise<unknown>, getStore: () => Promise<unknown>) =>
  render(
    <I18nProvider>
      <RulePreviewAttachmentSecurityProviders
        getServices={getServices as () => Promise<never>}
        getStore={getStore as () => Promise<never>}
      >
        <span data-test-subj="childContent">{'content'}</span>
      </RulePreviewAttachmentSecurityProviders>
    </I18nProvider>
  );

describe('RulePreviewAttachmentSecurityProviders', () => {
  it('shows a loading spinner while services are being resolved', () => {
    renderProviders(
      () => new Promise(() => {}),
      () => new Promise(() => {})
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('childContent')).not.toBeInTheDocument();
  });

  it('shows the error callout when service resolution fails', async () => {
    await act(async () => {
      renderProviders(
        () => Promise.reject(new Error('services failed')),
        () => new Promise(() => {})
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load rule preview')).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders children once both services and store resolve', async () => {
    await act(async () => {
      renderProviders(
        () => Promise.resolve({} as never),
        () => Promise.resolve({} as never)
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('childContent')).toBeInTheDocument();
    });
  });
});
