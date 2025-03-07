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
import type { EsHitRecord } from '@kbn/discover-utils';
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
  source?: EsHitRecord['_source'];
  scopeId?: string;
  contextId?: string;
}

export const useDynamicEntityFlyout = ({ onFlyoutClose }: { onFlyoutClose: () => void }) => {
  const { openFlyout, closeFlyout } = useExpandableFlyoutApi();
  const { notifications } = useKibana().services;
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const openDynamicFlyout = ({ entity, source, scopeId, contextId }: InventoryFlyoutProps) => {
    // User, Host, and Service entity flyouts rely on entity name to fetch required data
    if (['user', 'host', 'service'].includes(entity.type) && !entity.name) {
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

    switch (entity.type) {
      case 'user':
        openFlyout({
          right: { id: UserPanelKey, params: { userName: entity.name, scopeId, contextId } },
        });
        break;
      case 'host':
        openFlyout({
          right: { id: HostPanelKey, params: { hostName: entity.name, scopeId, contextId } },
        });
        break;
      case 'service':
        openFlyout({
          right: { id: ServicePanelKey, params: { serviceName: entity.name, scopeId, contextId } },
        });
        break;

      default:
        openFlyout({ right: { id: UniversalEntityPanelKey, params: { entity, source } } });
        break;
    }

    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS);
  };

  const closeDynamicFlyout = () => {
    closeFlyout();
  };

  return {
    openDynamicFlyout,
    closeDynamicFlyout,
  };
};
