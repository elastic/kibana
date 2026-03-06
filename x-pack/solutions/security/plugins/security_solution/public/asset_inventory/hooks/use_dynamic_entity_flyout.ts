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
import {
  HostPanelKey,
  ServicePanelKey,
  GenericEntityPanelKey,
  UserPanelKey,
} from '../../flyout/entity_details/shared/constants';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';
import { getEntityIdentifiersFromSource } from '../utils/entity_identifiers_from_source';
import type { GenericEntityRecord } from '../types/generic_entity_record';

interface InventoryFlyoutProps {
  /** Raw _source from the asset document (required for EUID extraction) */
  rawSource: GenericEntityRecord | Record<string, unknown>;
  /** Elasticsearch document _id (used for generic entity fetch) */
  entityDocId?: string;
  /** Entity type from entity.EngineMetadata.Type; can be omitted and derived from rawSource */
  entityType?: string;
  scopeId?: string;
  contextId?: string;
}

export const useDynamicEntityFlyout = ({ onFlyoutClose }: { onFlyoutClose: () => void }) => {
  const { openFlyout, closeFlyout } = useExpandableFlyoutApi();
  const { notifications } = useKibana().services;
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const openDynamicFlyout = ({
    rawSource,
    entityDocId,
    entityType,
    scopeId,
    contextId,
  }: InventoryFlyoutProps) => {
    const entityIdentifiers = getEntityIdentifiersFromSource(rawSource, entityType);

    // User, Host, and Service entity flyouts require entityIdentifiers (EUID-derived)
    if (entityType && ['user', 'host', 'service'].includes(entityType)) {
      if (!entityIdentifiers || Object.keys(entityIdentifiers).length === 0) {
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
    }

    const effectiveEntityType =
      entityType ?? (rawSource as GenericEntityRecord).entity?.EngineMetadata?.Type;

    const identifiers = entityIdentifiers ?? {};

    switch (effectiveEntityType) {
      case 'user':
        openFlyout({
          right: {
            id: UserPanelKey,
            params: {
              entityIdentifiers: identifiers,
              scopeId,
              contextID: contextId,
            },
          },
        });
        break;
      case 'host':
        openFlyout({
          right: {
            id: HostPanelKey,
            params: {
              entityIdentifiers: identifiers,
              scopeId,
              contextID: contextId,
              isPreviewMode: false,
            },
          },
        });
        break;
      case 'service':
        openFlyout({
          right: {
            id: ServicePanelKey,
            params: {
              entityIdentifiers: identifiers,
              scopeId,
              contextID: contextId,
            },
          },
        });
        break;

      default:
        openFlyout({
          right: {
            id: GenericEntityPanelKey,
            params: {
              entityDocId,
              entityId: entityIdentifiers?.['related.entity'],
              scopeId,
              contextId,
              isEngineMetadataExist: Boolean(effectiveEntityType),
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
