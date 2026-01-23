/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { union } from 'lodash';
import { isEmpty } from 'lodash/fp';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import type {
  BulkActionsConfig,
  RenderContentPanelProps,
} from '@kbn/response-ops-alerts-table/types';

import { useLicense } from '../../../../../common/hooks/use_license';
import { ASSIGNEES_PANEL_WIDTH } from '../../../../../common/components/assignees/constants';
import { BulkAlertAssigneesPanel } from '../../../../../common/components/toolbar/bulk_actions/alert_bulk_assignees';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { extractRelatedDetectionAlertIds } from '../utils/extract_related_detection_alert_ids';
import * as i18n from '../translations';
import { useApplyAttackAssignees } from '../apply_actions/use_apply_attack_assignees';
import type { AttackContentPanelConfig, BulkAttackActionItems } from '../types';

export interface UseBulkAttackAssigneesItemsProps {
  /** Callback when assignees are updated */
  onAssigneesUpdate?: () => void;
  /** Current alert assignments */
  alertAssignments?: string[];
}

/**
 * Hook that provides bulk action items and panels for updating assignees on attacks.
 * Handles both attacks only and attacks + related alerts updates.
 * Shows a confirmation modal internally when related alerts exist.
 */
export const useBulkAttackAssigneesItems = ({
  onAssigneesUpdate,
  alertAssignments,
}: UseBulkAttackAssigneesItemsProps = {}): BulkAttackActionItems => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();

  const { applyAssignees } = useApplyAttackAssignees();

  const onRemoveAllAssignees = useCallback<Required<BulkActionsConfig>['onClick']>(
    async (alertItems, _, setIsLoading) => {
      const assignedUserIds = union(
        ...alertItems.map(
          (item) =>
            item.data.find((data) => data.field === ALERT_WORKFLOW_ASSIGNEE_IDS)?.value ?? []
        )
      );
      if (!assignedUserIds.length) {
        return;
      }

      const assignees = {
        add: [],
        remove: assignedUserIds,
      };
      const attackIds = alertItems.map((item) => item._id);
      const relatedAlertIds = extractRelatedDetectionAlertIds(alertItems);

      await applyAssignees({
        assignees,
        attackIds,
        relatedAlertIds,
        setIsLoading,
        onSuccess: onAssigneesUpdate,
      });
    },
    [applyAssignees, onAssigneesUpdate]
  );

  const attackAssigneesItems: BulkActionsConfig[] = useMemo(() => {
    // Return empty array if user doesn't have required permissions or data is still loading
    if (loading || !hasIndexWrite || !hasAttackIndexWrite || !isPlatinumPlus) {
      return [];
    }

    return [
      {
        key: 'manage-attack-assignees',
        'data-test-subj': 'attack-assignees-context-menu-item',
        name: i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
        panel: 2,
        label: i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
        disableOnQuery: true,
        disable: false,
      },
      {
        key: 'remove-all-attack-assignees',
        'data-test-subj': 'remove-attack-assignees-menu-item',
        name: i18n.REMOVE_ALERT_ASSIGNEES_CONTEXT_MENU_TITLE,
        label: i18n.REMOVE_ALERT_ASSIGNEES_CONTEXT_MENU_TITLE,
        disableOnQuery: true,
        onClick: onRemoveAllAssignees,
        disable: alertAssignments ? isEmpty(alertAssignments) : false,
      },
    ];
  }, [
    alertAssignments,
    hasIndexWrite,
    hasAttackIndexWrite,
    isPlatinumPlus,
    loading,
    onRemoveAllAssignees,
  ]);

  const TitleContent = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>{i18n.ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const renderContent = useCallback(
    ({
      alertItems,
      refresh,
      setIsBulkActionsLoading,
      clearSelection,
      closePopoverMenu,
    }: RenderContentPanelProps) => {
      return (
        <BulkAlertAssigneesPanel
          alertItems={alertItems}
          refresh={() => {
            onAssigneesUpdate?.();
            refresh?.();
          }}
          setIsLoading={setIsBulkActionsLoading}
          clearSelection={clearSelection}
          closePopoverMenu={closePopoverMenu}
          onSubmit={async (assignees, _, onSuccessCallback, setIsLoading) => {
            // Show modal and wait for user decision
            closePopoverMenu();

            const attackIds = alertItems.map((item) => item._id);
            const relatedAlertIds = extractRelatedDetectionAlertIds(alertItems);

            await applyAssignees({
              assignees,
              attackIds,
              relatedAlertIds,
              setIsLoading,
              onSuccess: onSuccessCallback,
            });
          }}
        />
      );
    },
    [onAssigneesUpdate, applyAssignees]
  );

  const attackAssigneesPanels: AttackContentPanelConfig[] = useMemo(
    () =>
      hasIndexWrite && hasAttackIndexWrite && isPlatinumPlus && !loading
        ? [
            {
              id: 2,
              title: TitleContent,
              'data-test-subj': 'attack-assignees-context-menu-panel',
              renderContent,
              width: ASSIGNEES_PANEL_WIDTH,
            },
          ]
        : [],
    [TitleContent, hasIndexWrite, hasAttackIndexWrite, isPlatinumPlus, loading, renderContent]
  );

  return useMemo(
    () => ({
      items: attackAssigneesItems,
      panels: attackAssigneesPanels,
    }),
    [attackAssigneesItems, attackAssigneesPanels]
  );
};
