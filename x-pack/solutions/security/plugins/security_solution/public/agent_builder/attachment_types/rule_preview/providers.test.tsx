/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RulePreviewAttachmentSecurityProviders } from './providers';

vi.mock('../../../flyout_v2/shared/components/flyout_provider', () => {
      const mocked = {
      flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout', () => {
      const mocked = {
      SecuritySolutionFlyout: () => null,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useDarkMode: () => false,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/common', () => {
      const mocked = {
      EuiThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../data_view_manager/hooks/use_init_data_view_manager', () => {
      const mocked = {
      useInitDataViewManager: () => vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-redux-v7', () => {
      const mocked = {
      useSelector: vi.fn(),
      useDispatch: vi.fn(() => vi.fn()),
    };
      return { ...mocked, default: mocked };
    });

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
