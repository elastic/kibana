/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ListResponse } from '@kbn/entity-inventory-plugin/common';
import { HOST_TYPE_FIXTURE } from '../../../__fixtures__/inventory_data';
import { buildScenarioListResponse } from '../../../__fixtures__/inventory_scenarios';
import { createAppServicesMock } from '../../../mocks';
import { EntityTablePreferencesProvider } from '../../context/entity_table_preferences_context';
import type { UseEntityListResult } from '../../hooks/use_entity_list';
import { INITIAL_LIST_RESPONSE } from '../../hooks/use_entity_list';
import { EntityTable } from './entity_table';

// EuiDataGrid's render cost is largely fixed and can exceed the default 5s budget under parallel CI load.
jest.setTimeout(30_000);

const getHostList = (): ListResponse => {
  const list = buildScenarioListResponse('host', 'normal');
  if (!list) {
    throw new Error('Missing host fixture');
  }
  return list;
};

const renderTable = (listResult: Partial<UseEntityListResult>) => {
  const refresh = jest.fn();
  render(
    <I18nProvider>
      <KibanaContextProvider services={createAppServicesMock()}>
        <EntityTablePreferencesProvider>
          <EntityTable
            entityType={HOST_TYPE_FIXTURE}
            listResult={{ data: INITIAL_LIST_RESPONSE, loading: false, refresh, ...listResult }}
          />
        </EntityTablePreferencesProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return { refresh };
};

describe('EntityTable', () => {
  it('shows a skeleton while the first list loads', () => {
    renderTable({ loading: true });

    expect(screen.getByTestId('entityInventoryTableSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTable')).not.toBeInTheDocument();
  });

  it('keeps the rows up with a progress bar while a new range loads', () => {
    renderTable({ data: getHostList(), loading: true });

    expect(screen.getByTestId('entityInventoryTableReloading')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
  });

  it('shows the error with a retry that loads the list again', () => {
    const { refresh } = renderTable({ error: new Error('boom') });

    expect(screen.getByTestId('entityInventoryTableError')).toHaveTextContent('boom');
    fireEvent.click(screen.getByTestId('entityInventoryTableRetry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the skeleton, not the error, while a retry after a failure loads', () => {
    renderTable({ error: new Error('boom'), loading: true });

    expect(screen.getByTestId('entityInventoryTableSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTableError')).not.toBeInTheDocument();
  });

  it('shows the empty prompt when no entities match', () => {
    renderTable({ data: INITIAL_LIST_RESPONSE });

    expect(screen.getByTestId('entityInventoryTableEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTable')).not.toBeInTheDocument();
  });

  it('shows the grid when the list has rows', () => {
    renderTable({ data: getHostList() });

    expect(screen.getByTestId('entityInventoryTable')).toBeInTheDocument();
    expect(screen.queryByTestId('entityInventoryTableReloading')).not.toBeInTheDocument();
  });
});
