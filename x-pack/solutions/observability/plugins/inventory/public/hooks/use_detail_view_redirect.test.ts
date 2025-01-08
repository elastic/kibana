/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDetailViewRedirect } from './use_detail_view_redirect';
import { useKibana } from './use_kibana';
import {
  CONTAINER_ID,
  BUILT_IN_ENTITY_TYPES,
  HOST_NAME,
  SERVICE_NAME,
} from '@kbn/observability-shared-plugin/common';
import type { InventoryEntity } from '../../common/entities';

jest.mock('./use_kibana');

const useKibanaMock = useKibana as jest.Mock;

const commonEntityFields: Partial<InventoryEntity> = {
  entityLastSeenTimestamp: '2023-10-09T00:00:00Z',
  entityId: '1',
  entityDisplayName: 'entity_name',
  entityDefinitionId: 'entity_definition_id',
  entityDefinitionVersion: '1',
  entitySchemaVersion: '1',
};

describe('useDetailViewRedirect', () => {
  const mockGetIdentityFieldsValue = jest.fn();
  const mockAsKqlFilter = jest.fn();
  const mockGetRedirectUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue({
                getRedirectUrl: mockGetRedirectUrl,
              }),
            },
          },
        },
        entityManager: {
          entityClient: {
            getIdentityFieldsValue: mockGetIdentityFieldsValue,
            asKqlFilter: mockAsKqlFilter,
          },
        },
      },
    });
  });

  it('getEntityRedirectUrl should return the correct URL for host entity', () => {
    const entity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityType: 'built_in_hosts_from_ecs_data',
      entityIdentityFields: { source1: ['host.name'] },
      'host.name': 'host-1',
      'cloud.provider': null,
    };

    mockGetIdentityFieldsValue.mockReturnValue({ [HOST_NAME]: 'host-1' });
    mockGetRedirectUrl.mockReturnValue('asset-details-url');

    const { result } = renderHook(() => useDetailViewRedirect());
    const url = result.current.getEntityRedirectUrl(entity);

    expect(url).toBe('asset-details-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ assetId: 'host-1', assetType: 'host' });
  });

  it('getEntityRedirectUrl should return the correct URL for container entity', () => {
    const entity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityType: 'built_in_containers_from_ecs_data',
      entityIdentityFields: { source1: ['container.id'] },
      'container.id': 'container-1',
      'cloud.provider': null,
    };

    mockGetIdentityFieldsValue.mockReturnValue({ [CONTAINER_ID]: 'container-1' });
    mockGetRedirectUrl.mockReturnValue('asset-details-url');

    const { result } = renderHook(() => useDetailViewRedirect());
    const url = result.current.getEntityRedirectUrl(entity);

    expect(url).toBe('asset-details-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      assetId: 'container-1',
      assetType: 'container',
    });
  });

  it('getEntityRedirectUrl should return the correct URL for service entity', () => {
    const entity: InventoryEntity = {
      ...(commonEntityFields as InventoryEntity),
      entityType: 'built_in_services_from_ecs_data',
      entityIdentityFields: { source1: ['service.name'] },
      'service.name': 'service-1',
      'agent.name': 'node',
      'service.environment': 'prod',
    };
    mockGetIdentityFieldsValue.mockReturnValue({ [SERVICE_NAME]: 'service-1' });
    mockGetRedirectUrl.mockReturnValue('service-overview-url');

    const { result } = renderHook(() => useDetailViewRedirect());
    const url = result.current.getEntityRedirectUrl(entity);

    expect(url).toBe('service-overview-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'service-1',
    });
  });

  [
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.CLUSTER.ecs,
      'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
    ],
    [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.CLUSTER.semconv, 'kubernetes_otel-cluster-overview'],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.CRON_JOB.ecs,
      'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.DAEMON_SET.ecs,
      'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.DEPLOYMENT.ecs,
      'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.JOB.ecs,
      'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.NODE.ecs,
      'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.POD.ecs,
      'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.SERVICE,
      'kubernetes-ff1b3850-bcb1-11ec-b64f-7dd6e8e82013',
    ],
    [
      BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.STATEFUL_SET.ecs,
      'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
    ],
  ].forEach(([entityType, dashboardId]) => {
    it(`getEntityRedirectUrl should return the correct URL for ${entityType} entity`, () => {
      const entity: InventoryEntity = {
        ...(commonEntityFields as InventoryEntity),
        entityType,
        entityIdentityFields: { source1: ['some.field'] },
        'some.field': 'some-value',
      };

      mockAsKqlFilter.mockReturnValue('kql-query');
      mockGetRedirectUrl.mockReturnValue('dashboard-url');

      const { result } = renderHook(() => useDetailViewRedirect());
      const url = result.current.getEntityRedirectUrl(entity);

      expect(url).toBe('dashboard-url');
      expect(mockGetRedirectUrl).toHaveBeenCalledWith({
        dashboardId,
        query: {
          language: 'kuery',
          query: 'kql-query',
        },
      });
    });
  });
});
