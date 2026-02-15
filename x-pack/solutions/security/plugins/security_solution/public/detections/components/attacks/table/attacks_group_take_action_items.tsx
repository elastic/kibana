/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import {
  getAttackDiscoveryMarkdown,
  getOriginalAlertIds,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo } from 'react';
import { useInvalidateFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import type { inputsModel } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useAttackAssigneesContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_assignees_context_menu_items';
import { useAttackWorkflowStatusContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_workflow_status_context_menu_items';
import type { AttackWithWorkflowStatus } from '../../../hooks/attacks/bulk_actions/types';
import { useAttackTagsContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_tags_context_menu_items';
import { useAttackInvestigateInTimelineContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_investigate_in_timeline_context_menu_items';
import { useAttackCaseContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_case_context_menu_items';

interface AttacksGroupTakeActionItemsProps {
  attack: AttackDiscoveryAlert;
  /** Optional callback to close the containing popover menu */
  closePopover?: () => void;
}

export function AttacksGroupTakeActionItems({
  attack,
  closePopover,
}: AttacksGroupTakeActionItemsProps) {
  const invalidateAttackDiscoveriesCache = useInvalidateFindAttackDiscoveries();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
  const refetchQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);

  const originalAlertIds = useMemo(
    () => getOriginalAlertIds({ alertIds: attack.alertIds, replacements: attack.replacements }),
    [attack.alertIds, attack.replacements]
  );

  const baseAttackProps = useMemo(() => {
    return { attackId: attack.id, relatedAlertIds: originalAlertIds };
  }, [attack.id, originalAlertIds]);

  const attacksWithAssignees = useMemo(() => {
    return [{ ...baseAttackProps, assignees: attack.assignees }];
  }, [attack.assignees, baseAttackProps]);

  const onSuccess = useCallback(() => {
    invalidateAttackDiscoveriesCache();
    refetchQuery();
  }, [invalidateAttackDiscoveriesCache, refetchQuery]);

  const { items: assignItems, panels: assignPanels } = useAttackAssigneesContextMenuItems({
    attacksWithAssignees,
    onSuccess,
    closePopover,
  });

  const attacksWithWorkflowStatus = useMemo(() => {
    return [
      { ...baseAttackProps, workflowStatus: attack.alertWorkflowStatus },
    ] as AttackWithWorkflowStatus[];
  }, [attack.alertWorkflowStatus, baseAttackProps]);

  const { items: workflowItems, panels: workflowPanels } = useAttackWorkflowStatusContextMenuItems({
    attacksWithWorkflowStatus,
    onSuccess,
    closePopover,
  });

  const attacksWithTags = useMemo(() => {
    return [{ ...baseAttackProps, tags: attack.tags }];
  }, [attack.tags, baseAttackProps]);

  const { items: tagsItems, panels: tagsPanels } = useAttackTagsContextMenuItems({
    attacksWithTags,
    onSuccess,
    closePopover,
  });

  const attacksWithTimelineAlerts = useMemo(() => [{ ...baseAttackProps }], [baseAttackProps]);

  const { items: investigateInTimelineItems } = useAttackInvestigateInTimelineContextMenuItems({
    attacksWithTimelineAlerts,
    closePopover,
  });

  const attacksWithCase = useMemo(
    () => [
      {
        ...baseAttackProps,
        markdownComment: getAttackDiscoveryMarkdown({
          attackDiscovery: attack,
          replacements: attack.replacements,
        }),
      },
    ],
    [attack, baseAttackProps]
  );

  const { items: casesItems } = useAttackCaseContextMenuItems({
    closePopover,
    title: attack.title,
    attacksWithCase,
  });

  const defaultPanel: EuiContextMenuPanelDescriptor = useMemo(
    () => ({
      id: 0,
      items: [
        ...workflowItems,
        ...assignItems,
        ...tagsItems,
        ...investigateInTimelineItems,
        ...casesItems,
      ],
    }),
    [workflowItems, assignItems, tagsItems, investigateInTimelineItems, casesItems]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [defaultPanel, ...workflowPanels, ...assignPanels, ...tagsPanels],
    [workflowPanels, assignPanels, defaultPanel, tagsPanels]
  );

  return <EuiContextMenu initialPanelId={defaultPanel.id} panels={panels} />;
}
