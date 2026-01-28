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
import { useAttackWorkflowStatusContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_workflow_status_context_menu_items';
import type { AttackWithWorkflowStatus } from '../../../hooks/attacks/bulk_actions/types';

interface AttacksGroupTakeActionItemsProps {
  attack: AttackDiscoveryAlert;
}

export function AttacksGroupTakeActionItems({ attack }: AttacksGroupTakeActionItemsProps) {
  const invalidateAttackDiscoveriesCache = useInvalidateFindAttackDiscoveries();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
  const refetchQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);

  const attacksWithAssignees = useMemo(() => {
    return [
      {
        attackId: attack.id,
        assignees: attack.assignees,
        relatedAlertIds: attack.alertIds,
      },
    ];
  }, [attack]);

  const onSuccess = useCallback(() => {
    invalidateAttackDiscoveriesCache();
    refetchQuery();
  }, [invalidateAttackDiscoveriesCache, refetchQuery]);

  const { items: assignItems, panels: assignPanels } = useAttackAssigneesContextMenuItems({
    attacksWithAssignees,
    onSuccess,
  });

  const attacksWithWorkflowStatus = useMemo(() => {
    return [
      {
        attackId: attack.id,
        relatedAlertIds: attack.alertIds,
        workflowStatus: attack.alertWorkflowStatus,
      },
    ] as AttackWithWorkflowStatus[];
  }, [attack]);

  const { items: workflowItems, panels: workflowPanels } = useAttackWorkflowStatusContextMenuItems({
    attacksWithWorkflowStatus,
    onSuccess,
  });

  const defaultPanel: EuiContextMenuPanelDescriptor = useMemo(
    () => ({
      id: 0,
      items: [...workflowItems, ...assignItems],
    }),
    [workflowItems, assignItems]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [defaultPanel, ...workflowPanels, ...assignPanels],
    [workflowPanels, assignPanels, defaultPanel]
  );

  return <EuiContextMenu initialPanelId={defaultPanel.id} panels={panels} />;
}
