/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'redux-v4';
import { AttackFlyoutOverviewTab } from '.';
import type { StartServices } from '../../types';

const mockFlyoutProviders = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: (props: unknown) => mockFlyoutProviders(props as { children: React.ReactNode }),
}));

jest.mock('../../flyout_v2/attack/main/tabs/overview_tab', () => ({
  OverviewTab: () => (
    <div data-test-subj="attackOverviewTabMock">
      <div data-test-subj="mock-ai-summary-section" />
      <div data-test-subj="mock-visualizations-section" />
      <div data-test-subj="mock-insights-section" />
    </div>
  ),
}));

jest.mock('../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: () => false,
}));

jest.mock('../alert_flyout_overview_tab_component/data_view_manager_bootstrap', () => ({
  DataViewManagerBootstrap: () => null,
}));

describe('AttackFlyoutOverviewTab', () => {
  beforeEach(() => {
    mockFlyoutProviders.mockClear();
  });

  const servicesMock = {
    overlays: { openSystemFlyout: jest.fn() },
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
    },
  } as unknown as StartServices;

  const buildHit = (workflowStatus: string = 'open'): DataTableRecord =>
    ({
      id: '1',
      raw: {
        _id: 'attack-1',
        _index: 'test-index',
        _source: { 'kibana.alert.workflow_status': workflowStatus },
      },
      flattened: { _id: 'attack-1', _index: 'test-index' },
    } as unknown as DataTableRecord);

  it('does not render before promises resolve', () => {
    render(
      <AttackFlyoutOverviewTab
        hit={buildHit()}
        servicesPromise={new Promise<StartServices>(() => undefined)}
        storePromise={new Promise<ReturnType<typeof createStore>>(() => undefined) as never}
        onAttackUpdated={jest.fn()}
      />
    );

    expect(mockFlyoutProviders).not.toHaveBeenCalled();
  });

  it('renders overview tab through flyoutProviders when dependencies resolve', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={buildHit()}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).toHaveBeenCalledWith(
        expect.objectContaining({
          services: servicesMock,
          store,
        })
      );
    });

    expect(screen.getByTestId('attackOverviewTabMock')).toBeInTheDocument();
  });

  it('renders all three body sections: summary, visualizations, and insights', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={buildHit()}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-ai-summary-section')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-visualizations-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-insights-section')).toBeInTheDocument();
  });

  it('does not render when resolving dependencies fails', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={buildHit()}
        servicesPromise={Promise.reject(new Error('services failed'))}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).not.toHaveBeenCalled();
    });
  });
});
