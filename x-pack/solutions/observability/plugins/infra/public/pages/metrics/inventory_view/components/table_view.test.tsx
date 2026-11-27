/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { focusEuiToolTipTrigger } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import { InfraFormatterType } from '../../../../common/inventory/types';
import type { InfraWaffleMapOptions } from '../../../../common/inventory/types';
import type { SnapshotNode } from '../../../../../common/http_api/snapshot_api';
import { TableView } from './table_view';

jest.mock('../hooks/use_asset_details_flyout_url_state', () => ({
  useAssetDetailsFlyoutState: () => [{ detailsItemId: null, entityType: null }, jest.fn()],
}));

const options: InfraWaffleMapOptions = {
  formatter: InfraFormatterType.percent,
  formatTemplate: '{{value}}',
  metric: { type: 'cpu' },
  groupBy: [],
  legend: { type: 'gradient', rules: [] },
  sort: { by: 'name', direction: 'desc' },
};

const createNode = (value: string, label: string): SnapshotNode => ({
  name: label,
  path: [{ value, label }],
  metrics: [{ name: 'cpu', value: 0.5, avg: 0.5, max: 0.5 }],
});

const renderTableView = (nodes: SnapshotNode[]) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TableView
          nodes={nodes}
          nodeType="host"
          options={options}
          currentTime={Date.now()}
          formatter={(value) => String(value)}
          onFilter={jest.fn()}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('TableView', () => {
  it('does not describe the name button with a tooltip that only repeats the name', async () => {
    renderTableView([createNode('host-0', 'host-0')]);
    const button = screen.getByRole('button', { name: 'Open host details host-0' });

    focusEuiToolTipTrigger(button);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('host-0');
    expect(button).not.toHaveAttribute('aria-describedby');
  });

  it('describes the name button with a tooltip that adds the node id', async () => {
    renderTableView([createNode('host-0-id', 'host-0')]);
    const button = screen.getByRole('button', { name: 'Open host details host-0' });

    focusEuiToolTipTrigger(button);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('host-0 (host-0-id)');
    expect(button).toHaveAccessibleDescription('host-0 (host-0-id)');
  });
});
