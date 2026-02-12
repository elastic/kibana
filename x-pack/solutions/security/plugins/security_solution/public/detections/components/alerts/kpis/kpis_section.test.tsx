/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { KPIsSection } from './kpis_section';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { TestProviders } from '../../../../common/mock';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../../common/hooks/use_data_table_filters');

const dataView: DataView = createStubDataView({ spec: {} });

describe('<KPIsSection />', () => {
  it('should render correctly', () => {
    (useDataTableFilters as jest.Mock).mockReturnValue({
      showBuildingBlockAlerts: false,
      showOnlyThreatIndicatorAlerts: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <KPIsSection assignees={[]} dataView={dataView} pageFilters={undefined} />
      </TestProviders>
    );

    expect(getByTestId('chartPanels')).toBeInTheDocument();
    expect(getByTestId('euiSkeletonLoadingAriaWrapper')).toBeInTheDocument();
    expect(getByTestId('chartsLoadingSpinner')).toBeInTheDocument();
  });
});
