/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS,
  ASSET_INVENTORY_EXPAND_FLYOUT_ERROR,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useCallback, useEffect, useRef } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import type { EntityFlyoutHandle } from '../../flyout_v2/entity/use_entity_flyout_api';

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
  const { openHostFlyout, openUserFlyout, openServiceFlyout, openGenericEntityFlyout } =
    useFlyoutApi();
  const { notifications } = useKibana().services;

  // The flyout opened from the table, so deselecting its row can close it. Cleared once it closes.
  const flyoutRef = useRef<EntityFlyoutHandle | null>(null);
  // Read through a ref so a new `onFlyoutClose` (e.g. an inline arrow) doesn't need re-wiring.
  const onFlyoutCloseRef = useRef(onFlyoutClose);
  useEffect(() => {
    onFlyoutCloseRef.current = onFlyoutClose;
  }, [onFlyoutClose]);

  // Remembers the opened flyout, and tells the table when the user closes it so the row highlight
  // follows. Ignores a flyout that was already replaced by a newer one (another row was opened).
  const trackFlyout = useCallback((handle: EntityFlyoutHandle | undefined) => {
    if (!handle) return;
    flyoutRef.current = handle;
    handle.onClose.then(() => {
      if (flyoutRef.current !== handle) return;
      flyoutRef.current = null;
      onFlyoutCloseRef.current();
    });
  }, []);

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

    let handle: EntityFlyoutHandle | undefined;
    switch (entityType) {
      case 'user':
        handle = openUserFlyout({
          userName: entityName ?? '',
          entityId,
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
        });
        break;
      case 'host':
        handle = openHostFlyout({
          hostName: entityName ?? '',
          entityId,
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
        });
        break;
      case 'service':
        handle = openServiceFlyout({
          serviceName: entityName ?? '',
          entityId,
          scopeId,
          contextID: contextId,
          origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
        });
        break;
      default:
        if (entityDocId && entityId) {
          handle = openGenericEntityFlyout({
            entityDocId,
            entityId,
            scopeId,
            contextID: contextId,
            origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
          });
        } else if (entityId) {
          handle = openGenericEntityFlyout({
            entityId,
            scopeId,
            contextID: contextId,
            origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
          });
        } else if (entityDocId) {
          handle = openGenericEntityFlyout({
            entityDocId,
            scopeId,
            contextID: contextId,
            origin: FLYOUT_ORIGIN.ASSET_INVENTORY,
          });
        }
        break;
    }

    trackFlyout(handle);
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ASSET_INVENTORY_EXPAND_FLYOUT_SUCCESS);
  };

  const closeDynamicFlyout = useCallback(() => {
    const handle = flyoutRef.current;
    flyoutRef.current = null;
    handle?.close();
  }, []);

  return {
    openDynamicFlyout,
    closeDynamicFlyout,
  };
};
