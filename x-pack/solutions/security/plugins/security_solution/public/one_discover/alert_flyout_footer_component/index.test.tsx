/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'redux';
import { AlertFlyoutFooter } from '.';
import type { StartServices } from '../../types';
import { SECURITY_FEATURE_ID } from '../../../common/constants';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';

const mockDocumentFooter = jest.fn((props: unknown) => {
  const { onShowNotes } = props as { onShowNotes?: () => void };
  return (
    <button type="button" onClick={onShowNotes}>
      {'MockDocumentFooter'}
    </button>
  );
});
const mockFlyoutProviders = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('../../flyout_v2/document/main/footer', () => ({
  Footer: (props: unknown) => mockDocumentFooter(props),
}));
jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: (props: unknown) => mockFlyoutProviders(props as { children: React.ReactNode }),
}));
jest.mock('../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(),
}));

describe('AlertFlyoutFooter', () => {
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);

  beforeEach(() => {
    mockDocumentFooter.mockClear();
    mockFlyoutProviders.mockClear();
    mockUseIsInSecurityApp.mockReturnValue(false);
  });

  const servicesMock = {
    overlays: { openSystemFlyout: jest.fn() },
    core: { overlays: {} },
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
    },
    application: {
      capabilities: {
        [SECURITY_FEATURE_ID]: { show: true, crud: true },
      },
    },
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    http: {},
    upselling: {},
  } as unknown as StartServices;

  const mockOnAlertUpdated = jest.fn();

  it('does not render before promises resolve', () => {
    const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;
    const unresolvedServicesPromise = new Promise<StartServices>(() => undefined);
    const unresolvedStorePromise = new Promise<ReturnType<typeof createStore>>(() => undefined);

    render(
      <AlertFlyoutFooter
        hit={hit}
        servicesPromise={unresolvedServicesPromise}
        storePromise={unresolvedStorePromise as never}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    expect(screen.queryByText('MockDocumentFooter')).not.toBeInTheDocument();
    expect(mockFlyoutProviders).not.toHaveBeenCalled();
  });

  it('renders shared document footer through flyoutProviders when dependencies resolve', async () => {
    const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const storePromise = Promise.resolve(store as never);
    render(
      <AlertFlyoutFooter
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={storePromise}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentFooter')).toBeInTheDocument();
    });

    expect(mockDocumentFooter).toHaveBeenCalledWith(
      expect.objectContaining({ hit, onAlertUpdated: mockOnAlertUpdated })
    );
    expect(mockFlyoutProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        services: servicesMock,
        store,
      })
    );
  });

  it('does not render footer when resolving dependencies fails', async () => {
    const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    render(
      <AlertFlyoutFooter
        hit={hit}
        servicesPromise={Promise.reject(new Error('services failed'))}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).not.toHaveBeenCalled();
    });
    expect(screen.queryByText('MockDocumentFooter')).not.toBeInTheDocument();
    expect(mockDocumentFooter).not.toHaveBeenCalled();
  });

  it('uses Discover history key when opening notes outside Security app', async () => {
    mockUseIsInSecurityApp.mockReturnValue(false);
    const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    render(
      <AlertFlyoutFooter
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentFooter')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockDocumentFooter'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
      })
    );
  });

  it('uses Security history key when opening notes in Security app', async () => {
    mockUseIsInSecurityApp.mockReturnValue(true);
    const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    render(
      <AlertFlyoutFooter
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentFooter')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockDocumentFooter'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
      })
    );
  });
});
