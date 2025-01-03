/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import { EqlQueryReadOnly } from './eql_query';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  eqlQuery,
  mockDataView,
} from '../../storybook/mocks';

export default {
  component: EqlQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/eql_query',
};

export const EqlQueryWithIndexPatterns = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
    }}
  >
    <EqlQueryReadOnly eqlQuery={eqlQuery} dataSource={dataSourceWithIndexPatterns} />
  </ThreeWayDiffStorybookProviders>
);

export const EqlQueryWithDataView = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
    }}
  >
    <EqlQueryReadOnly eqlQuery={eqlQuery} dataSource={dataSourceWithDataView} />
  </ThreeWayDiffStorybookProviders>
);
