/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

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

export const InventoryFlyoutSelector = ({
  entity,
  onFlyoutClose,
  scopeId,
  contextId,
}: InventoryFlyoutSelectorProps) => {
  const { openDynamicFlyout } = useDynamicEntityFlyout({
    entity,
    onFlyoutClose,
    scopeId,
    contextId,
  });

  useEffect(() => {
    openDynamicFlyout();
  }, [contextId, entity, scopeId, onFlyoutClose, openDynamicFlyout]);

  // This component is responsible for opening the flyout using useExpandableFlyoutApi
  // we return an empty fragment because we don't want to render anything else
  return <></>;
};
