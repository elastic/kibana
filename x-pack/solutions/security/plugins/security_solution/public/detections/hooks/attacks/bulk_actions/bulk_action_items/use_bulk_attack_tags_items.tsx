/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIconTip, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type {
  BulkActionsConfig,
  RenderContentPanelProps,
} from '@kbn/response-ops-alerts-table/types';
import { BulkAlertTagsPanel } from '../../../../../common/components/toolbar/bulk_actions/alert_bulk_tags';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { extractRelatedDetectionAlertIds } from '../utils/extract_related_detection_alert_ids';
import { useApplyAttackTags } from '../apply_actions/use_apply_attack_tags';
import * as i18n from '../translations';
import type { AttackContentPanelConfig, BulkAttackActionItems } from '../types';

export interface UseBulkAttackTagsItemsProps {
  /** Optional callback when tags are updated */
  onTagsUpdate?: () => void;
}

/**
 * Hook that provides bulk action items and panels for updating tags on attacks.
 * Handles both attacks only and attacks + related alerts updates.
 * Shows a confirmation modal internally when related alerts exist.
 */
export const useBulkAttackTagsItems = ({
  onTagsUpdate,
}: UseBulkAttackTagsItemsProps = {}): BulkAttackActionItems => {
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();
  const { applyTags } = useApplyAttackTags();

  const attackTagsItems: BulkActionsConfig[] = useMemo(() => {
    // Return empty array if user doesn't have required permissions or data is still loading
    if (loading || !hasIndexWrite || !hasAttackIndexWrite) {
      return [];
    }

    return [
      {
        key: 'manage-attack-tags',
        'data-test-subj': 'attack-tags-context-menu-item',
        name: i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
        panel: 1,
        label: i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
        disableOnQuery: true,
      },
    ];
  }, [hasIndexWrite, hasAttackIndexWrite, loading]);

  const TitleContent = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>{i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={i18n.ALERT_TAGS_CONTEXT_MENU_ITEM_TOOLTIP_INFO} position="right" />
        </EuiFlexItem>
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
        <BulkAlertTagsPanel
          alertItems={alertItems}
          refresh={() => {
            onTagsUpdate?.();
            refresh?.();
          }}
          setIsLoading={setIsBulkActionsLoading}
          clearSelection={clearSelection}
          closePopoverMenu={closePopoverMenu}
          onSubmit={async (tags, _, onSuccess, setIsLoading) => {
            closePopoverMenu();

            const attackIds = alertItems.map((item) => item._id);
            const relatedAlertIds = extractRelatedDetectionAlertIds(alertItems);

            await applyTags({
              tags,
              attackIds,
              relatedAlertIds,
              setIsLoading,
              onSuccess,
            });
          }}
        />
      );
    },
    [applyTags, onTagsUpdate]
  );

  const attackTagsPanels: AttackContentPanelConfig[] = useMemo(
    () =>
      hasIndexWrite && hasAttackIndexWrite && !loading
        ? [
            {
              id: 1,
              title: TitleContent,
              'data-test-subj': 'attack-tags-context-menu-panel',
              renderContent,
            },
          ]
        : [],
    [TitleContent, hasIndexWrite, hasAttackIndexWrite, loading, renderContent]
  );

  return useMemo(
    () => ({
      items: attackTagsItems,
      panels: attackTagsPanels,
    }),
    [attackTagsItems, attackTagsPanels]
  );
};
