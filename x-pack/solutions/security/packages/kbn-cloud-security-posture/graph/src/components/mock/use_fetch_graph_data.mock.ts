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

// Scenario: Grouped entities node as actor (4 items, different ecsParentField, all availableInEntityStore = false)
// with single target
export const groupedActorMockData = {
  nodes: [
    {
      id: 'grp(a(mixed-entities)-b(target-role))',
      shape: 'group',
    },
    {
      id: 'mixed-entities',
      color: 'primary',
      shape: 'rectangle',
      icon: 'users',
      count: 4,
      label: 'Mixed Entities',
      tag: 'Actor',
      documentsData: [
        {
          id: 'user-entity-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'user',
            availableInEntityStore: false,
          },
        },
        {
          id: 'service-entity-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'service',
            availableInEntityStore: false,
          },
        },
        {
          id: 'host-entity-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'host',
            availableInEntityStore: false,
          },
        },
        {
          id: 'entity-entity-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'entity',
            availableInEntityStore: false,
          },
        },
      ],
    },
    {
      id: 'target-role',
      color: 'primary',
      shape: 'hexagon',
      icon: 'question',
      label: 'Target Role',
      tag: 'Role',
      documentsData: [
        {
          id: 'target-role',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            name: 'Target Role',
            type: 'role',
            ecsParentField: 'entity',
            availableInEntityStore: true,
          },
        },
      ],
    },
    {
      id: 'a(mixed-entities)-b(target-role)label(google.iam.admin.v1.CreateRole)',
      label: 'google.iam.admin.v1.CreateRole',
      color: 'danger',
      shape: 'label',
      parentId: 'grp(a(mixed-entities)-b(target-role))',
      documentsData: [
        {
          id: 'event-1',
          type: DOCUMENT_TYPE_ALERT,
        },
      ],
    },
  ],
  edges: [
    {
      id: 'a(mixed-entities)-b(grp(a(mixed-entities)-b(target-role)))',
      source: 'mixed-entities',
      target: 'grp(a(mixed-entities)-b(target-role))',
      color: 'danger',
      type: 'solid',
    },
    {
      id: 'a(grp(a(mixed-entities)-b(target-role)))-b(target-role)',
      source: 'grp(a(mixed-entities)-b(target-role))',
      target: 'target-role',
      color: 'danger',
      type: 'solid',
    },
    {
      id: 'a(grp(a(mixed-entities)-b(target-role)))-b(a(mixed-entities)-b(target-role)label(google.iam.admin.v1.CreateRole))',
      source: 'grp(a(mixed-entities)-b(target-role))',
      target: 'a(mixed-entities)-b(target-role)label(google.iam.admin.v1.CreateRole)',
      color: 'danger',
      type: 'solid',
    },
    {
      id: 'a(a(mixed-entities)-b(target-role)label(google.iam.admin.v1.CreateRole))-b(grp(a(mixed-entities)-b(target-role)))',
      source: 'a(mixed-entities)-b(target-role)label(google.iam.admin.v1.CreateRole)',
      target: 'grp(a(mixed-entities)-b(target-role))',
      color: 'danger',
      type: 'solid',
    },
  ],
};

// Scenario: Single entity node actor with grouped entities node as target (4 items, different ecsParentField, all availableInEntityStore = false)
export const groupedTargetMockData = {
  nodes: [
    {
      id: 'grp(a(single-actor)-b(mixed-targets))',
      shape: 'group',
    },
    {
      id: 'single-actor',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      label: 'Single Actor',
      tag: 'User',
      documentsData: [
        {
          id: 'single-actor',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            name: 'Single Actor',
            type: 'user',
            ecsParentField: 'user',
            availableInEntityStore: true,
          },
        },
      ],
    },
    {
      id: 'mixed-targets',
      color: 'primary',
      shape: 'rectangle',
      icon: 'storage',
      count: 4,
      label: 'Mixed Targets',
      tag: 'Target',
      documentsData: [
        {
          id: 'user-target-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'user',
            availableInEntityStore: false,
          },
        },
        {
          id: 'service-target-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'service',
            availableInEntityStore: false,
          },
        },
        {
          id: 'host-target-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'host',
            availableInEntityStore: false,
          },
        },
        {
          id: 'entity-target-1',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'entity',
            availableInEntityStore: false,
          },
        },
      ],
    },
    {
      id: 'a(single-actor)-b(mixed-targets)label(google.iam.admin.v1.CreateRole)',
      label: 'google.iam.admin.v1.CreateRole',
      color: 'danger',
      shape: 'label',
      parentId: 'grp(a(single-actor)-b(mixed-targets))',
      documentsData: [
        {
          id: 'event-2',
          type: DOCUMENT_TYPE_EVENT,
        },
      ],
    },
  ],
  edges: [
    {
      id: 'a(single-actor)-b(grp(a(single-actor)-b(mixed-targets)))',
      source: 'single-actor',
      target: 'grp(a(single-actor)-b(mixed-targets))',
      color: 'danger',
      type: 'solid',
    },
    {
      id: 'a(grp(a(single-actor)-b(mixed-targets)))-b(mixed-targets)',
      source: 'grp(a(single-actor)-b(mixed-targets))',
      target: 'mixed-targets',
      color: 'danger',
      type: 'solid',
    },
    {
      id: 'a(grp(a(single-actor)-b(mixed-targets)))-b(a(single-actor)-b(mixed-targets)label(google.iam.admin.v1.CreateRole))',
      source: 'grp(a(single-actor)-b(mixed-targets))',
      target: 'a(single-actor)-b(mixed-targets)label(google.iam.admin.v1.CreateRole)',
      color: 'danger',
      type: 'solid',
    },
    {
      id: 'a(a(single-actor)-b(mixed-targets)label(google.iam.admin.v1.CreateRole))-b(grp(a(single-actor)-b(mixed-targets)))',
      source: 'a(single-actor)-b(mixed-targets)label(google.iam.admin.v1.CreateRole)',
      target: 'grp(a(single-actor)-b(mixed-targets))',
      color: 'danger',
      type: 'solid',
    },
  ],
};

// Default scenario: single-actor (existing data)
export const singleActorMockData = {
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
      label: 'admin@example.com',
      tag: 'User',
      documentsData: [
        {
          id: 'admin@example.com',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            ecsParentField: 'user',
            availableInEntityStore: false,
          },
        },
      ],
    },
    {
      id: 'projects/your-project-id/roles/customRole',
      color: 'primary',
      shape: 'hexagon',
      icon: 'question',
      label: 'Custom Role',
      tag: 'Role',
      documentsData: [
        {
          id: 'projects/your-project-id/roles/customRole',
          type: DOCUMENT_TYPE_ENTITY,
          entity: {
            name: 'Custom Role',
            type: 'role',
            ecsParentField: 'entity',
            availableInEntityStore: true,
          },
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
  ],
};

export const useFetchGraphData = (params: UseFetchGraphDataParams) => {
  const {
    data: { useFetchGraphDataMock },
  } = useMockDataContext();

  useFetchGraphDataMock?.log?.(JSON.stringify(params));

  // Use data from context if provided, otherwise default to single actor data
  const mockData = useFetchGraphDataMock?.data ?? singleActorMockData;

  return useMemo(
    () => ({
      isLoading: false,
      isFetching: useFetchGraphDataMock?.isFetching ?? false,
      isError: false,
      data: mockData,
      refresh: useFetchGraphDataMock?.refresh ?? (() => {}),
    }),
    [useFetchGraphDataMock, mockData]
  );
};
