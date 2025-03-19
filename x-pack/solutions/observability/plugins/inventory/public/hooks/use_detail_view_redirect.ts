/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ASSET_DETAILS_LOCATOR_ID,
  BUILT_IN_ENTITY_TYPES,
  SERVICE_OVERVIEW_LOCATOR_ID,
  type AssetDetailsLocatorParams,
  type ServiceOverviewParams,
} from '@kbn/observability-shared-plugin/common';
import { useCallback } from 'react';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { isBuiltinEntityOfType } from '../../common/utils/check_entity_type';
import type { InventoryEntity } from '../../common/entities';
import { useKibana } from './use_kibana';

const KUBERNETES_DASHBOARDS_IDS: Record<string, string> = {
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.CLUSTER.ecs]:
    'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.CLUSTER.semconv]: 'kubernetes_otel-cluster-overview',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.CRON_JOB.ecs]:
    'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.DAEMON_SET.ecs]:
    'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.DEPLOYMENT.ecs]:
    'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.JOB.ecs]: 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.NODE.ecs]: 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.POD.ecs]: 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.SERVICE]: 'kubernetes-ff1b3850-bcb1-11ec-b64f-7dd6e8e82013',
  [BUILT_IN_ENTITY_TYPES.KUBERNETES_V2.STATEFUL_SET.ecs]:
    'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
};

export const useDetailViewRedirect = () => {
  const {
    services: { share, entityManager },
  } = useKibana();

  const locators = share.url.locators;
  const assetDetailsLocator = locators.get<AssetDetailsLocatorParams>(ASSET_DETAILS_LOCATOR_ID);
  const dashboardLocator = locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  const serviceOverviewLocator = locators.get<ServiceOverviewParams>(SERVICE_OVERVIEW_LOCATOR_ID);

  const getDetailViewRedirectUrl = useCallback(
    (entity: InventoryEntity) => {
      const identityFieldsValue = entityManager.entityClient.getIdentityFieldsValue({
        entity,
      });
      const identityFields = Object.keys(identityFieldsValue || {});

      if (
        isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.HOST_V2, entity) ||
        isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.CONTAINER_V2, entity)
      ) {
        return assetDetailsLocator?.getRedirectUrl({
          assetId: identityFieldsValue[identityFields[0]],
          assetType: isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.HOST_V2, entity)
            ? 'host'
            : 'container',
        });
      }

      if (isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.SERVICE_V2, entity)) {
        return serviceOverviewLocator?.getRedirectUrl({
          serviceName: identityFieldsValue[identityFields[0]],
        });
      }

      return undefined;
    },
    [assetDetailsLocator, entityManager.entityClient, serviceOverviewLocator]
  );

  const getDashboardRedirectUrl = useCallback(
    (entity: InventoryEntity) => {
      const { entityType: type } = entity;
      const dashboardId = KUBERNETES_DASHBOARDS_IDS[type];

      return dashboardId
        ? dashboardLocator?.getRedirectUrl({
            dashboardId,
            query: {
              language: 'kuery',
              query: entityManager.entityClient.asKqlFilter({
                entity,
              }),
            },
          })
        : undefined;
    },
    [dashboardLocator, entityManager.entityClient]
  );

  const getEntityRedirectUrl = useCallback(
    (entity: InventoryEntity) =>
      getDetailViewRedirectUrl(entity) ?? getDashboardRedirectUrl(entity),
    [getDashboardRedirectUrl, getDetailViewRedirectUrl]
  );

  return { getEntityRedirectUrl };
};
