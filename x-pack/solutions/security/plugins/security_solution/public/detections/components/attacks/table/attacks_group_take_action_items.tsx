/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo } from 'react';
import { useInvalidateFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import type { inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useAttackAssigneesContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_assignees_context_menu_items';

interface AttacksGroupTakeActionItemsProps {
  attack?: AttackDiscoveryAlert;
}

export function AttacksGroupTakeActionItems({ attack }: AttacksGroupTakeActionItemsProps) {
  const invalidateAttackDiscoveriesCache = useInvalidateFindAttackDiscoveries();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
  const refetchQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);

  const attacksWithAssignees = useMemo(() => {
    if (attack?.id) {
      return [
        {
          attackId: attack.id,
          assignees: attack?.assignees,
          relatedAlertIds: attack?.alertIds ?? [],
        },
      ];
    }
    return [];
  }, [attack]);

  const onAssignSuccess = useCallback(() => {
    invalidateAttackDiscoveriesCache();
    refetchQuery();
  }, [invalidateAttackDiscoveriesCache, refetchQuery]);

  const { items: assignItems, panels: assignPanels } = useAttackAssigneesContextMenuItems({
    attacksWithAssignees,
    onSuccess: onAssignSuccess,
  });

  const defaultPanel: EuiContextMenuPanelDescriptor = useMemo(
    () => ({
      id: 0,
      items: [...assignItems],
    }),
    [assignItems]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [defaultPanel, ...assignPanels],
    [assignPanels, defaultPanel]
  );

  return <EuiContextMenu initialPanelId={defaultPanel.id} panels={panels} />;
}
