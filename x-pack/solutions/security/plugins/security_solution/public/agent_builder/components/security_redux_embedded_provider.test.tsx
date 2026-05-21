/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  SecurityCanvasEmbeddedBundle,
  SecurityReduxEmbeddedProviderProps,
} from './security_redux_embedded_provider';
import { SecurityReduxEmbeddedProvider } from './security_redux_embedded_provider';

jest.mock('../../common/lib/kibana/kibana_react', () => ({
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="kibanaContextProviderMock">{children}</div>
  ),
}));

jest.mock('../../common/components/upselling_provider', () => ({
  UpsellingProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="upsellingProviderMock">{children}</div>
  ),
}));

jest.mock('../../cases/components/provider/provider', () => ({
  CaseProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="caseProviderMock">{children}</div>
  ),
}));

jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="cellActionsProviderMock">{children}</div>
  ),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  ExpandableFlyoutProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="expandableFlyoutProviderMock">{children}</div>
  ),
}));

jest.mock('@kbn/security-solution-navigation', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="navigationProviderMock">{children}</div>
  ),
}));

jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="reduxProviderMock">{children}</div>
  ),
}));

const fakeBundle = (): SecurityCanvasEmbeddedBundle =>
  ({
    store: { dispatch: jest.fn(), getState: jest.fn(), subscribe: jest.fn() },
    kibanaServices: {
      uiActions: { getTriggerCompatibleActions: jest.fn() },
      upselling: {},
    },
  } as unknown as SecurityCanvasEmbeddedBundle);

const renderProvider = (
  resolveCanvasContext: SecurityReduxEmbeddedProviderProps['resolveCanvasContext']
) =>
  render(
    <I18nProvider>
      <SecurityReduxEmbeddedProvider resolveCanvasContext={resolveCanvasContext}>
        <span data-test-subj="embeddedChild">{'embedded'}</span>
      </SecurityReduxEmbeddedProvider>
    </I18nProvider>
  );

describe('SecurityReduxEmbeddedProvider', () => {
  it('shows a loading spinner while resolveCanvasContext is pending', () => {
    const pending = new Promise<SecurityCanvasEmbeddedBundle>(() => {
      /* never resolves */
    });
    renderProvider(() => pending);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('embeddedChild')).not.toBeInTheDocument();
  });

  it('mounts the children (and nested providers) once the bundle resolves', async () => {
    const bundle = fakeBundle();
    const resolveCanvasContext = jest.fn(async () => bundle);

    await act(async () => {
      renderProvider(resolveCanvasContext);
    });

    await waitFor(() => {
      expect(screen.getByTestId('embeddedChild')).toBeInTheDocument();
    });
    // Each provider wrapper is present so hooks that require them resolve correctly.
    expect(screen.getByTestId('kibanaContextProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('cellActionsProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('navigationProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('reduxProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('upsellingProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('caseProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('expandableFlyoutProviderMock')).toBeInTheDocument();
    expect(resolveCanvasContext).toHaveBeenCalledTimes(1);
  });

  it('ignores a late bundle resolution after unmount', async () => {
    let resolveBundle: (b: SecurityCanvasEmbeddedBundle) => void = () => undefined;
    const pending = new Promise<SecurityCanvasEmbeddedBundle>((resolve) => {
      resolveBundle = resolve;
    });

    const { unmount } = renderProvider(() => pending);
    unmount();

    // Should not throw — the internal `cancelled` guard suppresses setState after unmount.
    await act(async () => {
      resolveBundle(fakeBundle());
    });
  });
});
