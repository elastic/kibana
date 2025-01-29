/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  mockDataView,
} from '../../storybook/mocks';
import { DataSourceReadOnly } from './data_source';

export default {
  component: DataSourceReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/data_source',
};

export const DataSourceWithIndexPatterns = () => (
  <DataSourceReadOnly dataSource={dataSourceWithIndexPatterns} />
);

export const DataSourceWithDataView = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
    }}
  >
    <DataSourceReadOnly dataSource={dataSourceWithDataView} />
  </ThreeWayDiffStorybookProviders>
);

export const NoValue = () => <DataSourceReadOnly />;
