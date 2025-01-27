/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import React, { useEffect } from 'react';
import { useOnExpandableFlyoutClose } from '../../flyout/shared/hooks/use_on_expandable_flyout_close';

interface InventoryFlyoutSelectorProps {
  entity: {
    id: string;
    type: 'universal' | 'user' | 'host';
    timestamp: string;
  };
  onFlyoutClose: () => void;
}

const panelMap = {
  universal: 'universal-entity-panel',
  user: 'user-panel',
  host: 'host-panel',
} as const;

export const InventoryFlyoutSelector = ({
  entity,
  onFlyoutClose,
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
        },
      },
    });
  }, [entity, openFlyout, panelId]);

  return <></>;
};
