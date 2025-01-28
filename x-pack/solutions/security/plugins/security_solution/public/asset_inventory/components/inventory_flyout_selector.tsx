/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import React, { useEffect } from 'react';
import {
  HostPanelKey,
  ServicePanelKey,
  UniversalEntityPanelKey,
  UserPanelKey,
} from '../../flyout/entity_details/shared/constants';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';

interface InventoryFlyoutSelectorProps {
  // TODO: Asset Inventory - use ECS type definition for universal entity
  entity: {
    id: string;
    // TODO: Asset Inventory - use dedicated type for entity.type
    type: 'universal' | 'user' | 'host' | 'service';
    timestamp: string;
  };
  onFlyoutClose: () => void;
  scopeId?: string;
  contextId?: string;
}

const panelMap = {
  universal: UniversalEntityPanelKey,
  user: UserPanelKey,
  host: HostPanelKey,
  service: ServicePanelKey,
} as const;

export const InventoryFlyoutSelector = ({
  entity,
  onFlyoutClose,
  scopeId,
  contextId,
}: InventoryFlyoutSelectorProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const panelId = panelMap[entity.type] || panelMap.universal;

  useEffect(() => {
    openFlyout({
      right: {
        id: panelId,
        params: {
          entity,
          scopeId,
          contextId,
        },
      },
    });
  }, [contextId, entity, openFlyout, panelId, scopeId]);

  // This component is responsible for opening the flyout using useExpandableFlyoutApi
  // we return an empty fragment because we don't want to render anything else
  return <></>;
};
