/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
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
            id: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            shape: 'group',
          },
          {
            id: 'admin@example.com',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
          },
          {
            id: 'projects/your-project-id/roles/customRole',
            color: 'primary',
            shape: 'hexagon',
            icon: 'question',
            documentsData: [
              {
                id: '1',
                type: DOCUMENT_TYPE_ENTITY,
              },
            ],
          },
          {
            id: 'grouped-entity-uuid-123',
            color: 'primary',
            shape: 'ellipse',
            icon: 'user',
            label: 'AWS IAM',
            tag: 'Identity',
            count: 3,
            documentsData: [
              {
                id: 'entity-1',
                type: DOCUMENT_TYPE_ENTITY,
                entity: {
                  name: 'user-1@example.com',
                  type: 'Identity',
                  sub_type: 'AWS IAM',
                },
              },
              {
                id: 'entity-2',
                type: DOCUMENT_TYPE_ENTITY,
                entity: {
                  name: 'user-2@example.com',
                  type: 'Identity',
                  sub_type: 'AWS IAM',
                },
              },
              {
                id: 'entity-3',
                type: DOCUMENT_TYPE_ENTITY,
                entity: {
                  name: 'user-3@example.com',
                  type: 'Identity',
                  sub_type: 'AWS IAM',
                },
              },
            ],
          },
          {
            id: 'grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole))',
            shape: 'group',
          },
          {
            id: 'a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)label(grouped-events)',
            label: 'grouped-events',
            color: 'primary',
            shape: 'label',
            parentId:
              'grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole))',
            uniqueEventsCount: 2,
            uniqueAlertsCount: 1,
            documentsData: [
              {
                id: 'grouped-event-1',
                type: DOCUMENT_TYPE_EVENT,
              },
              {
                id: 'grouped-event-2',
                type: DOCUMENT_TYPE_EVENT,
              },
              {
                id: 'grouped-alert-1',
                type: DOCUMENT_TYPE_ALERT,
              },
            ],
          },
          {
            id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
            label: 'google.iam.admin.v1.CreateRole',
            color: 'danger',
            shape: 'label',
            parentId: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            documentsData: [
              {
                id: '1',
                type: DOCUMENT_TYPE_ALERT,
              },
            ],
          },
          {
            id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)',
            label: 'google.iam.admin.v1.UpdateRole',
            color: 'primary',
            shape: 'label',
            parentId: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            documentsData: [
              {
                id: '1',
                type: DOCUMENT_TYPE_EVENT,
              },
            ],
          },
          {
            id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole)',
            label: 'google.iam.admin.v1.DeleteRole',
            color: 'primary',
            shape: 'label',
            parentId: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
          },
        ],
        edges: [
          {
            id: 'a(admin@example.com)-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
            source: 'admin@example.com',
            target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            color: 'danger',
            type: 'solid',
          },
          {
            id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(projects/your-project-id/roles/customRole)',
            source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            target: 'projects/your-project-id/roles/customRole',
            color: 'danger',
            type: 'solid',
          },
          {
            id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))',
            source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            target:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
            color: 'danger',
            type: 'solid',
          },
          {
            id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
            source:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
            target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            color: 'danger',
            type: 'solid',
          },
          {
            id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole))',
            source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            target:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole))-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
            source:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.UpdateRole)',
            target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole))',
            source: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            target:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole)',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole))-b(grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole)))',
            source:
              'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.DeleteRole)',
            target: 'grp(a(admin@example.com)-b(projects/your-project-id/roles/customRole))',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(grouped-entity-uuid-123)-b(grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)))',
            source: 'grouped-entity-uuid-123',
            target: 'grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole))',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)))-b(projects/your-project-id/roles/customRole)',
            source: 'grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole))',
            target: 'projects/your-project-id/roles/customRole',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)))-b(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)label(grouped-events))',
            source: 'grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole))',
            target:
              'a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)label(grouped-events)',
            color: 'subdued',
            type: 'solid',
          },
          {
            id: 'a(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)label(grouped-events))-b(grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)))',
            source:
              'a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole)label(grouped-events)',
            target: 'grp(a(grouped-entity-uuid-123)-b(projects/your-project-id/roles/customRole))',
            color: 'subdued',
            type: 'solid',
          },
        ],
      },
      refresh: useFetchGraphDataMock?.refresh ?? (() => {}),
    }),
    [useFetchGraphDataMock]
  );
};
