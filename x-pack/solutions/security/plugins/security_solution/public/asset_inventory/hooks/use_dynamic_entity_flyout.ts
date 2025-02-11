/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import {
  ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS,
  ASSET_INVENTORY_EXPAND_FLYOUT_ERROR,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import {
  HostPanelKey,
  ServicePanelKey,
  UniversalEntityPanelKey,
  UserPanelKey,
} from '../../flyout/entity_details/shared/constants';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';

interface InventoryFlyoutProps {
  entity: EntityEcs;
  scopeId?: string;
  contextId?: string;
}

interface SecurityFlyoutPanelsCommonParams {
  scopeId?: string;
  contextId?: string;
  [key: string]: unknown;
}

type FlyoutParams =
  | {
      id: typeof UniversalEntityPanelKey;
      params: { entity: EntityEcs };
    }
  | { id: typeof UserPanelKey; params: { userName: string } & SecurityFlyoutPanelsCommonParams }
  | { id: typeof HostPanelKey; params: { hostName: string } & SecurityFlyoutPanelsCommonParams }
  | {
      id: typeof ServicePanelKey;
      params: { serviceName: string } & SecurityFlyoutPanelsCommonParams;
    };

const getFlyoutParamsByEntity = ({
  entity,
  scopeId,
  contextId,
}: InventoryFlyoutProps): FlyoutParams => {
  const entitiesFlyoutParams: Record<EntityEcs['type'], FlyoutParams> = {
    universal: { id: UniversalEntityPanelKey, params: { entity } },
    user: { id: UserPanelKey, params: { userName: entity.name, scopeId, contextId } },
    host: { id: HostPanelKey, params: { hostName: entity.name, scopeId, contextId } },
    service: { id: ServicePanelKey, params: { serviceName: entity.name, scopeId, contextId } },
  } as const;

  return entitiesFlyoutParams[entity.type];
};

export const useDynamicEntityFlyout = ({ onFlyoutClose }: { onFlyoutClose: () => void }) => {
  const { openFlyout, closeFlyout } = useExpandableFlyoutApi();
  const { notifications } = useKibana().services;
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const openDynamicFlyout = ({ entity, scopeId, contextId }: InventoryFlyoutProps) => {
    const entityFlyoutParams = getFlyoutParamsByEntity({ entity, scopeId, contextId });

    // User, Host, and Service entity flyouts rely on entity name to fetch required data
    if (entity.type !== 'universal' && !entity.name) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.securitySolution.assetInventory.openFlyout.missingEntityNameTitle',
          { defaultMessage: 'Missing Entity Name' }
        ),
        text: i18n.translate(
          'xpack.securitySolution.assetInventory.openFlyout.missingEntityNameText',
          { defaultMessage: 'Entity name is required for User, Host, and Service entities' }
        ),
      });

      uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ASSET_INVENTORY_EXPAND_FLYOUT_ERROR);
      onFlyoutClose();
      return;
    }

    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS);

    openFlyout({
      right: {
        id: entityFlyoutParams.id || UniversalEntityPanelKey,
        params: entityFlyoutParams.params,
      },
    });
  };

  const closeDynamicFlyout = () => {
    closeFlyout();
  };

  return {
    openDynamicFlyout,
    closeDynamicFlyout,
  };
};
