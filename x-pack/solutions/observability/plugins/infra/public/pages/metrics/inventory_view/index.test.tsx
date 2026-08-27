/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { SnapshotPage } from '.';
import { inventoryTitle } from '../../../translations';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useTrackPageview: jest.fn(),
}));

jest.mock('../../../hooks/use_metrics_breadcrumbs', () => ({
  useMetricsBreadcrumbs: jest.fn(),
}));

jest.mock('../../../components/shared/templates/infra_page_template', () => ({
  InfraPageTemplate: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="infraPageTemplate">{children}</div>
  ),
}));

jest.mock('./components/snapshot_container', () => ({
  SnapshotContainer: () => <div data-test-subj="inventorySnapshotContainer" />,
}));

jest.mock('./hooks/use_waffle_time', () => ({
  WaffleTimeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_waffle_filters', () => ({
  WaffleFiltersProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_waffle_options', () => ({
  WaffleOptionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_inventory_views', () => ({
  InventoryViewsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./providers/inventory_timerange_metadata_provider', () => ({
  InventoryTimeRangeMetadataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../header/use_metrics_app_header_menu', () => ({
  useMetricsAppHeaderMenu: () => ({
    menu: { items: [] },
    flyouts: null,
  }),
}));

describe('SnapshotPage', () => {
  it('renders AppHeader with the inventory title and no back control', async () => {
    render(
      <EuiProvider>
        <MockAppHeaderProvider>
          <SnapshotPage />
        </MockAppHeaderProvider>
      </EuiProvider>
    );

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      inventoryTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('inventorySnapshotContainer')).toBeInTheDocument();
  });
});
