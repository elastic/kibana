/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AlertFlyoutOverviewTab } from '.';
import type { StartServices } from '../../types';

jest.mock('../../flyout_v2/document/tabs/overview_tab', () => ({
  OverviewTab: () => null,
}));

describe('AlertFlyoutOverviewTab', () => {
  it('wraps the overview tab in KibanaContextProvider and ReactQueryClientProvider', async () => {
    const hit = {
      id: '1',
      raw: {},
      flattened: {
        'event.kind': 'signal',
      },
    } as unknown as DataTableRecord;

    const coreStartMock = {
      overlays: {},
    };

    let resolveServices: (services: StartServices) => void;
    const servicesPromise = new Promise<StartServices>((resolve) => {
      resolveServices = resolve;
    });

    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(
        <AlertFlyoutOverviewTab hit={hit} servicesPromise={servicesPromise} />
      );
    });

    await act(async () => {
      resolveServices({ core: coreStartMock } as StartServices);
      await servicesPromise;
    });

    const providers = tree.root.findAllByType(KibanaContextProvider);
    expect(providers).toHaveLength(1);

    // Ensure the nested provider preserves the react-query wrapper
    const reactQueryProviders = tree.root.findAll((node) => {
      const nodeType = node.type as React.ComponentType;
      return nodeType?.displayName === 'ReactQueryClientProvider';
    });
    expect(reactQueryProviders).toHaveLength(1);
  });
});
