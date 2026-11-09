/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS,
  ASSET_INVENTORY_EXPAND_FLYOUT_ERROR,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';

interface InventoryFlyoutProps {
  /** Raw _source from the asset document (required for EUID extraction) */
  entityId: string;
  entityDocId?: string;
  entityType?: string;
  entityName?: string;
  scopeId: string;
  contextId?: string;
}

export const useDynamicEntityFlyout = ({ onFlyoutClose }: { onFlyoutClose: () => void }) => {
  const { closeFlyout } = useExpandableFlyoutApi();
  const { openHostFlyout, openUserFlyout, openServiceFlyout, openGenericEntityFlyout } =
    useFlyoutApi();
  const { notifications } = useKibana().services;
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const openDynamicFlyout = ({
    entityDocId,
    entityId,
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
        openUserFlyout({
          userName: entityName ?? '',
          entityId,
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
        });
        break;
      case 'host':
        openHostFlyout({
          hostName: entityName ?? '',
          entityId,
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
        });
        break;
      case 'service':
        openServiceFlyout({
          serviceName: entityName ?? '',
          entityId,
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
        });
        break;
      default:
        if (entityDocId && entityId) {
          openGenericEntityFlyout({
            entityDocId,
            entityId,
            scopeId,
            contextID: contextId,
            origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
          });
        } else if (entityId) {
          openGenericEntityFlyout({
            entityId,
            scopeId,
            contextID: contextId,
            origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
          });
        } else if (entityDocId) {
          openGenericEntityFlyout({
            entityDocId,
            scopeId,
            contextID: contextId,
            origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
          });
        }
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
