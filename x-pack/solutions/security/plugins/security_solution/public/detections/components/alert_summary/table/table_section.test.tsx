/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { TestProviders } from '../../../../common/mock';
import { GROUPED_TABLE_TEST_ID, TableSection } from './table_section';

const dataView: DataView = createStubDataView({ spec: {} });

describe('<TableSection />', () => {
  it('should render all components', () => {
    const { getByTestId } = render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    expect(getByTestId(GROUPED_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId('alertsTableErrorPrompt')).toBeInTheDocument();
  });
});
