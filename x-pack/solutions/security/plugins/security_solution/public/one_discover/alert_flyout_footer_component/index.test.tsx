/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'redux';
import { AlertFlyoutFooter } from '.';
import type { StartServices } from '../../types';
import { SECURITY_FEATURE_ID } from '../../../common/constants';

const mockDocumentFooter = jest.fn((_props: unknown) => <div>{'MockDocumentFooter'}</div>);
const mockFlyoutProviders = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('../../flyout_v2/document/footer', () => ({
  Footer: (props: unknown) => mockDocumentFooter(props),
}));
jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: (props: unknown) => mockFlyoutProviders(props as { children: React.ReactNode }),
}));

describe('AlertFlyoutFooter', () => {
  beforeEach(() => {
    mockDocumentFooter.mockClear();
    mockFlyoutProviders.mockClear();
  });

  const servicesMock = {
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
});
