/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { TestProviders } from '../../../../common/mock';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TABLE_SECTION_TEST_ID, TableSection } from './table_section';
import { useUserData } from '../../user_info';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';

vi.mock('../../user_info');
vi.mock('../../../containers/detection_engine/lists/use_lists_config');

const dataView: DataView = createStubDataView({
  spec: { title: '.alerts-security.alerts-default' },
});

describe('<GroupedTable />', () => {
  it('should render correctly', () => {
    (useUserData as Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as Mock).mockReturnValue({
      loading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <TableSection assignees={[]} dataView={dataView} pageFilters={[]} statusFilter={[]} />
      </TestProviders>
    );

    expect(getByTestId(TABLE_SECTION_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('internalAlertsPageLoading')).toBeInTheDocument();
  });

  it('should not render the table while things user data is loading', () => {
    (useUserData as Mock).mockReturnValue([
      {
        loading: true,
      },
    ]);
    (useListsConfig as Mock).mockReturnValue({
      loading: false,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <TableSection assignees={[]} dataView={dataView} pageFilters={[]} statusFilter={[]} />
      </TestProviders>
    );

    expect(queryByTestId('internalAlertsPageLoading')).not.toBeInTheDocument();
  });

  it('should not render the table while things list config is loading', () => {
    (useUserData as Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as Mock).mockReturnValue({
      loading: true,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <TableSection assignees={[]} dataView={dataView} pageFilters={[]} statusFilter={[]} />
      </TestProviders>
    );

    expect(queryByTestId('internalAlertsPageLoading')).not.toBeInTheDocument();
  });

  it('should not render the table if pageFilters is undefined', () => {
    (useUserData as Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as Mock).mockReturnValue({
      loading: false,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <TableSection
          assignees={[]}
          dataView={dataView}
          pageFilters={undefined}
          statusFilter={[]}
        />
      </TestProviders>
    );

    expect(queryByTestId('internalAlertsPageLoading')).not.toBeInTheDocument();
  });
});
