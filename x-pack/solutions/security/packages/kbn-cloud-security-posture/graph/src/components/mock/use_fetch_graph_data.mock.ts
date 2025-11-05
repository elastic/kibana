/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UseFetchGraphDataParams } from '../../hooks/use_fetch_graph_data';
import { useMockDataContext } from './mock_context_provider';

export const useFetchGraphData = (params: UseFetchGraphDataParams) => {
  const {
    data: { useFetchGraphDataMock },
  } = useMockDataContext();

  useFetchGraphDataMock?.log?.(JSON.stringify(params));
  return useMemo(
    () => ({
      isLoading: false,
      isFetching: useFetchGraphDataMock?.isFetching ?? false,
      isError: false,
      data: {
        nodes: [
          {
            id: 'admin@example.com',
            label: 'admin@example.com',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
          {
            id: 'projects/your-project-id/roles/customRole',
            label: 'projects/your-project-id/roles/customRole',
            color: 'primary',
            shape: 'hexagon',
            icon: 'question',
          },
          {
            id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
            label: 'google.iam.admin.v1.CreateRole',
            source: 'admin@example.com',
            target: 'projects/your-project-id/roles/customRole',
            color: 'primary',
            shape: 'label',
          },
        ],
        edges: [
          {
            id: 'a(admin@example.com)-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))',
            source: 'admin@example.com',
            sourceShape: 'ellipse',
            target:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
            targetShape: 'label',
            color: 'primary',
          },
          {
            id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))-b(projects/your-project-id/roles/customRole)',
            source:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
            sourceShape: 'label',
            target: 'projects/your-project-id/roles/customRole',
            targetShape: 'hexagon',
            color: 'primary',
          },
        ],
      },
      refresh: useFetchGraphDataMock?.refresh ?? (() => {}),
    }),
    [useFetchGraphDataMock]
  );
};
