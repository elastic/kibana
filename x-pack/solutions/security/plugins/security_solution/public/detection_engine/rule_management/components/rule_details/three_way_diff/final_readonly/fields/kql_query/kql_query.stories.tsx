/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KqlQueryReadOnly } from '.';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  inlineKqlQuery,
  mockDataView,
  savedKqlQuery,
  savedQueryResponse,
} from '../../storybook/mocks';

export default {
  component: KqlQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/kql_query',
};

export const InlineKqlQueryWithIndexPatterns = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
    }}
  >
    <KqlQueryReadOnly
      ruleType="query"
      kqlQuery={inlineKqlQuery}
      dataSource={dataSourceWithIndexPatterns}
    />
  </ThreeWayDiffStorybookProviders>
);

export const InlineKqlQueryWithDataView = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
    }}
  >
    <KqlQueryReadOnly
      ruleType="query"
      kqlQuery={inlineKqlQuery}
      dataSource={dataSourceWithDataView}
    />
  </ThreeWayDiffStorybookProviders>
);

/*
  Filters should still be displayed if no `data_source` is provided.
  Component would fall back to the default index pattern in such case.
*/
export const InlineKqlQueryWithoutDataSource = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
    }}
  >
    <KqlQueryReadOnly ruleType="query" kqlQuery={inlineKqlQuery} />
  </ThreeWayDiffStorybookProviders>
);

export const SavedKqlQueryWithIndexPatterns = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
      http: {
        get: async () => savedQueryResponse,
      },
    }}
  >
    <KqlQueryReadOnly
      ruleType="saved_query"
      kqlQuery={savedKqlQuery}
      dataSource={dataSourceWithIndexPatterns}
    />
  </ThreeWayDiffStorybookProviders>
);

export const SavedKqlQueryWithDataView = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
      http: {
        get: async () => savedQueryResponse,
      },
    }}
  >
    <KqlQueryReadOnly
      ruleType="saved_query"
      kqlQuery={savedKqlQuery}
      dataSource={dataSourceWithDataView}
    />
  </ThreeWayDiffStorybookProviders>
);
