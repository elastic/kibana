/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { createStore } from 'redux-v4';
import { IOCFlyoutOverviewTab } from '.';
import type { StartServices } from '../../types';

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../flyout_v2/ioc/main/content', () => ({
  Content: () => <div data-test-subj="iocContentMock" />,
}));

jest.mock('../../flyout_v2/ioc/main/tabs', () => ({
  getTabsDisplayed: () => [],
}));

const mockFlyoutV2DocViewerStateSync = jest.fn((_: unknown) => null);
jest.mock('../flyout_v2_doc_viewer_state_sync', () => ({
  FlyoutV2DocViewerStateSync: (props: unknown) => mockFlyoutV2DocViewerStateSync(props),
}));

describe('IOCFlyoutOverviewTab', () => {
  const hit = {
    id: '1',
    raw: { _id: 'indicator-1', _index: 'logs-ti_abuse' },
    flattened: {},
  } as unknown as DataTableRecord;

  beforeEach(() => {
    mockFlyoutV2DocViewerStateSync.mockClear();
  });

  it('syncs the flyouts it opens with the doc view state', async () => {
    const store = createStore(() => ({}));
    const onInitialStateChange = jest.fn();
    const initialState = { flyoutV2: [{ kind: 'host' as const, hostName: 'web-01' }] };

    render(
      <IOCFlyoutOverviewTab
        hit={hit}
        servicesPromise={Promise.resolve({} as StartServices)}
        storePromise={Promise.resolve(store as never)}
        initialState={initialState}
        onInitialStateChange={onInitialStateChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('iocContentMock')).toBeInTheDocument();
    });

    expect(mockFlyoutV2DocViewerStateSync).toHaveBeenCalledWith({
      hit,
      initialState,
      onInitialStateChange,
    });
  });
});
