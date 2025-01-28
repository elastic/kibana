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
  // TODO: Asset Inventory - use EntityEcs type definition for universal entity
  entity: {
    id: string;
    name: string;
    // TODO: Asset Inventory - use dedicated type for entity.type
    type: 'universal' | 'user' | 'host' | 'service';
    timestamp: string;
  };
  onFlyoutClose: () => void;
  scopeId?: string;
  contextId?: string;
}

type SecuritySolutionFlyoutPanelId =
  | typeof UniversalEntityPanelKey
  | typeof UserPanelKey
  | typeof HostPanelKey
  | typeof ServicePanelKey;

const entityPanelMap: Record<
  // TODO: Asset Inventory - replace with EntityEcs.type definition
  InventoryFlyoutSelectorProps['entity']['type'],
  SecuritySolutionFlyoutPanelId
> = {
  universal: UniversalEntityPanelKey,
  user: UserPanelKey,
  host: HostPanelKey,
  service: ServicePanelKey,
};

interface SecurityFlyoutPanelsCommonParams {
  scopeId?: string;
  contextId?: string;
}

type FlyoutParams =
  | {
      id: typeof UniversalEntityPanelKey;
      params: { entity: InventoryFlyoutSelectorProps['entity'] };
    }
  | { id: typeof UserPanelKey; params: { userName: string } & SecurityFlyoutPanelsCommonParams }
  | { id: typeof HostPanelKey; params: { hostName: string } & SecurityFlyoutPanelsCommonParams }
  | {
      id: typeof ServicePanelKey;
      params: { serviceName: string } & SecurityFlyoutPanelsCommonParams;
    };

export const InventoryFlyoutSelector = ({
  entity,
  onFlyoutClose,
  scopeId,
  contextId,
}: InventoryFlyoutSelectorProps) => {
  const { openFlyout } = useExpandableFlyoutApi();
  useOnExpandableFlyoutClose({ callback: onFlyoutClose });

  const securitySolutionFlyoutPanelId = entityPanelMap[entity.type] || entityPanelMap.universal;

  useEffect(() => {
    const flyoutParams: Record<InventoryFlyoutSelectorProps['entity']['type'], FlyoutParams> = {
      universal: { id: UniversalEntityPanelKey, params: { entity } },
      user: { id: UserPanelKey, params: { userName: entity.name, scopeId, contextId } },
      host: { id: HostPanelKey, params: { hostName: entity.name, scopeId, contextId } },
      service: { id: ServicePanelKey, params: { serviceName: entity.name, scopeId, contextId } },
    };

    openFlyout({
      right: {
        id: flyoutParams[entity.type].id,
        params: flyoutParams[entity.type].params,
      },
    });
  }, [contextId, entity, openFlyout, securitySolutionFlyoutPanelId, scopeId]);

  // This component is responsible for opening the flyout using useExpandableFlyoutApi
  // we return an empty fragment because we don't want to render anything else
  return <></>;
};
