/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityType } from '../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import type { FlyoutOrigin } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';

export interface OpenableEntity {
  type: string;
  name: string;
  id: string;
}

export const isKnownEntityType = (type: string): type is EntityType =>
  (Object.values(EntityType) as string[]).includes(type);

interface UseOpenEntityFlyoutResult {
  /** False when no entity flyout exists for this type (legacy flyout only). */
  canOpen: (entity: OpenableEntity) => boolean;
  open: (entity: OpenableEntity) => void;
}

/** Opens the entity details flyout, using the new flyout when enabled and the legacy panels otherwise. */
export const useOpenEntityFlyout = (
  scopeId: string,
  origin: FlyoutOrigin = FLYOUT_ORIGIN.THREAT_HUNTING_LEADS
): UseOpenEntityFlyoutResult => {
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openFlyout } = useExpandableFlyoutApi();
  const { openEntityFlyout } = useFlyoutApi();

  const canOpen = useCallback(
    ({ type }: OpenableEntity) =>
      isKnownEntityType(type) && (enableNewFlyout || Boolean(EntityPanelKeyByType[type])),
    [enableNewFlyout]
  );

  const open = useCallback(
    (entity: OpenableEntity) => {
      const { type } = entity;
      if (!isKnownEntityType(type) || !canOpen(entity)) return;
      const sharedParams = { entityId: entity.id, contextID: scopeId, scopeId };

      if (enableNewFlyout) {
        openEntityFlyout({
          engineType: type,
          entityName: entity.name,
          origin,
          ...sharedParams,
        });
        return;
      }

      const panelKey = EntityPanelKeyByType[type];
      const paramName = EntityPanelParamByType[type];
      if (panelKey && paramName) {
        openFlyout({
          right: { id: panelKey, params: { [paramName]: entity.name, ...sharedParams } },
        });
      }
    },
    [canOpen, enableNewFlyout, openEntityFlyout, openFlyout, origin, scopeId]
  );

  return { canOpen, open };
};
