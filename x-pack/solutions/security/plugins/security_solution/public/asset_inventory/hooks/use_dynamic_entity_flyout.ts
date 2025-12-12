/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ASSET_INVENTORY_EXPAND_FLYOUT_ERROR,
  ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { useFlyoutApi } from '@kbn/flyout';
import {
  GenericEntityPanelKey,
  HostPanelKey,
  ServicePanelKey,
  UserPanelKey,
} from '../../flyout/entity_details/shared/constants';
import { useKibana } from '../../common/lib/kibana';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';

interface InventoryFlyoutProps {
  entityDocId?: string;
  entityType?: string;
  entityName?: string;
  scopeId?: string;
  contextId?: string;
}

export const useDynamicEntityFlyout = ({ onFlyoutClose }: { onFlyoutClose: () => void }) => {
  const { openFlyout, closeFlyout } = useFlyoutApi();
  const { notifications } = useKibana().services;
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const openDynamicFlyout = ({
    entityDocId,
    entityType,
    entityName,
    scopeId,
    contextId,
  }: InventoryFlyoutProps) => {
    // User, Host, and Service entity flyouts rely on entity name to fetch required data
    if (entityType && ['user', 'host', 'service'].includes(entityType) && !entityName) {
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

    switch (entityType) {
      case 'user':
        openFlyout({
          main: { id: UserPanelKey, params: { userName: entityName, scopeId, contextId } },
        });
        break;
      case 'host':
        openFlyout({
          main: { id: HostPanelKey, params: { hostName: entityName, scopeId, contextId } },
        });
        break;
      case 'service':
        openFlyout({
          main: {
            id: ServicePanelKey,
            params: { serviceName: entityName, scopeId, contextId },
          },
        });

        break;

      default:
        openFlyout({
          main: {
            id: GenericEntityPanelKey,
            params: {
              entityDocId,
              scopeId,
              contextId,
              isEngineMetadataExist: Boolean(entityType), // Pass whether entityType exists to avoid error state in generic flyout
            },
          },
        });
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
