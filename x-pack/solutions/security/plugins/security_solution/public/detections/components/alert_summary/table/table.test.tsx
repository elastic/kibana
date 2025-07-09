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
import { Table } from './table';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';

const dataView: DataView = createStubDataView({ spec: {} });
const packages: PackageListItem[] = [
  {
    id: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '0.1.0',
  },
];
const ruleResponse = {
  rules: [],
  isLoading: false,
};

describe('<Table />', () => {
  it('should render all components', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Table
          dataView={dataView}
          groupingFilters={[]}
          packages={packages}
          ruleResponse={ruleResponse}
        />
      </TestProviders>
    );

    expect(getByTestId('internalAlertsPageLoading')).toBeInTheDocument();
  });
});
