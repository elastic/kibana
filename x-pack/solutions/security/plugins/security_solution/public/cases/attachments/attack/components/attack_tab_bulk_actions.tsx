/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import numeral from '@elastic/numeral';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { getAttackDiscoveryMarkdown, getOriginalAlertIds } from '@kbn/elastic-assistant-common';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import {
  withActionIcons,
  withGroupSeparators,
  withStatusDotIcons,
} from '../../../../common/utils/action_menu_items';
import {
  ACTION_ICONS_BY_ID,
  ATTACK_STATUS_ICON_COLORS,
} from '../../../../common/utils/action_icons';
import {
  ATTACK_TAB_BULK_ACTIONS_TEST_ID,
  ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID,
  ATTACK_TAB_BULK_ACTIONS_POPOVER_TEST_ID,
  ATTACK_TAB_BULK_ACTIONS_SELECT_ALL_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { useInvalidateFindAttackDiscoveries } from '../../../../attack_discovery/pages/use_find_attack_discoveries';
import { useAttackAssigneesContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_assignees_context_menu_items';
import { useAttackCaseContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_case_context_menu_items';
import { useAttackInvestigateInTimelineContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_investigate_in_timeline_context_menu_items';
import { useAttackRunWorkflowContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_run_workflow_context_menu_items';
import { useAttackTagsContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_tags_context_menu_items';
import { useAttackWorkflowStatusContextMenuItems } from '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_workflow_status_context_menu_items';
import type {
  AttackWithCase,
  AttackWithWorkflowStatus,
} from '../../../../detections/hooks/attacks/bulk_actions/types';
import { toAttacksToAttach } from '../utils';

/** The telemetry source every bulk action taken from this bar is attributed to. */
const TELEMETRY_SOURCE = 'case_attachment_table';

const BULK_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.bulkActionsAriaLabel',
  { defaultMessage: 'Bulk actions' }
);

/** Mirrors the alerts table's toolbar, where the count is the button rather than a label beside it. */
const getSelectedLabel = (attackCountFormatted: string, attackCount: number): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.selectedAttacksLabel', {
    defaultMessage:
      'Selected {attackCountFormatted} {attackCount, plural, one {attack} other {attacks}}',
    values: { attackCountFormatted, attackCount },
  });

const getSelectAllLabel = (attackCountFormatted: string, attackCount: number): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.selectAllAttacksLabel', {
    defaultMessage:
      'Select all {attackCountFormatted} {attackCount, plural, one {attack} other {attacks}}',
    values: { attackCountFormatted, attackCount },
  });

const CLEAR_SELECTION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.clearSelectionLabel',
  { defaultMessage: 'Clear selection' }
);

/** Matches the alerts table toolbar, which lays its two controls out inline. */
const containerStyles = { display: 'inline-block', position: 'relative' } as const;

/** Names the whole selection where a single row names its attack. */
const getSelectionTitle = (attackCount: number): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.selectedAttacksTitle', {
    defaultMessage: '{attackCount, plural, one {# attack} other {# attacks}}',
    values: { attackCount },
  });

/** One selected row. */
export interface SelectedAttack {
  /** The attack document `_id`, persisted as the attachment id. */
  attackId: string;
  /** The attack title, from the live document where it resolved and the snapshot otherwise. */
  title: string;
  /**
   * The live attack document. The grid only lets a row be selected once it has one, so in practice
   * this is always set; it stays optional so the bar is still correct on its own terms, and the
   * filter below is what enforces that.
   */
  attack?: AttackDiscoveryAlert;
}

export interface AttackTabBulkActionsProps {
  /** The selected rows. The bar renders nothing while none of them can be acted on. */
  selectedAttacks: readonly SelectedAttack[];
  /** Every row the grid is currently showing, which is what "select all" selects. */
  totalAttacks: number;
  /** True once the selection covers every row, which turns the select-all control into a clear. */
  areAllAttacksSelected: boolean;
  /** Selects every row, or clears the selection when they are all selected already. */
  onToggleSelectAll: () => void;
  /** Called once a bulk action lands, so the grid can drop a selection it has already acted on. */
  onActionSuccess: () => void;
}

/**
 * The attacks grid's bulk action bar: a count of the selection, and the attack take-action verbs
 * applied across it. Nothing here removes an attachment — an attack is removed from its own entry
 * in the case activity timeline, as an alert is.
 */
export const AttackTabBulkActions = ({
  selectedAttacks,
  totalAttacks,
  areAllAttacksSelected,
  onToggleSelectAll,
  onActionSuccess,
}: AttackTabBulkActionsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const invalidateAttackDiscoveriesCache = useInvalidateFindAttackDiscoveries();

  const onSuccess = useCallback(() => {
    invalidateAttackDiscoveriesCache();
    onActionSuccess();
  }, [invalidateAttackDiscoveriesCache, onActionSuccess]);

  // A row that resolved to nothing but its snapshot has no live document to act on. The grid
  // already keeps those out of the selection, so this is a backstop rather than the guard — but
  // it is the one the bar's own count and title are drawn from, so the bar never names more than
  // it will touch even if a caller hands it an unresolved row.
  const actionableAttacks = useMemo(
    () =>
      selectedAttacks.flatMap(({ attack, title }) => (attack != null ? [{ attack, title }] : [])),
    [selectedAttacks]
  );

  const resolvedAttacks = useMemo(
    () => actionableAttacks.map(({ attack }) => attack),
    [actionableAttacks]
  );

  const baseAttackProps = useMemo(
    () =>
      resolvedAttacks.map((attack) => ({
        attackId: attack.id,
        attackIndex: attack.index,
        relatedAlertIds: getOriginalAlertIds({
          alertIds: attack.alertIds,
          replacements: attack.replacements,
        }),
      })),
    [resolvedAttacks]
  );

  const attacksWithWorkflowStatus = useMemo(
    () =>
      baseAttackProps.map((props, position) => ({
        ...props,
        workflowStatus: resolvedAttacks[position].alertWorkflowStatus,
      })) as AttackWithWorkflowStatus[],
    [baseAttackProps, resolvedAttacks]
  );

  const { items: workflowItems, panels: workflowPanels } = useAttackWorkflowStatusContextMenuItems({
    attacksWithWorkflowStatus,
    closePopover,
    onSuccess,
    telemetrySource: TELEMETRY_SOURCE,
  });

  const attacksWithTags = useMemo(
    () =>
      baseAttackProps.map((props, position) => ({
        ...props,
        tags: resolvedAttacks[position].tags,
      })),
    [baseAttackProps, resolvedAttacks]
  );

  const { items: tagsItems, panels: tagsPanels } = useAttackTagsContextMenuItems({
    attacksWithTags,
    closePopover,
    onSuccess,
    telemetrySource: TELEMETRY_SOURCE,
  });

  const attacksWithAssignees = useMemo(
    () =>
      baseAttackProps.map((props, position) => ({
        ...props,
        assignees: resolvedAttacks[position].assignees,
      })),
    [baseAttackProps, resolvedAttacks]
  );

  const { items: assignItems, panels: assignPanels } = useAttackAssigneesContextMenuItems({
    attacksWithAssignees,
    closePopover,
    onSuccess,
    telemetrySource: TELEMETRY_SOURCE,
  });

  const { items: runWorkflowItems, panels: runWorkflowPanels } =
    useAttackRunWorkflowContextMenuItems({
      attacksForWorkflowRun: baseAttackProps,
      closePopover,
      telemetrySource: TELEMETRY_SOURCE,
    });

  const { items: investigateInTimelineItems } = useAttackInvestigateInTimelineContextMenuItems({
    attacksWithTimelineAlerts: baseAttackProps,
    closePopover,
    telemetrySource: TELEMETRY_SOURCE,
  });

  // Only attachable where we know which index the attack document came from — the attachment
  // metadata requires it — so a selected attack without one is left out of the case items rather
  // than costing the rest of the selection the action.
  const attachableAttacks = useMemo(
    () => resolvedAttacks.filter(({ index }) => index != null),
    [resolvedAttacks]
  );

  const attacksWithCase = useMemo<AttackWithCase[]>(
    () =>
      attachableAttacks.map((attack) => ({
        attackId: attack.id,
        attackIndex: attack.index,
        relatedAlertIds: getOriginalAlertIds({
          alertIds: attack.alertIds,
          replacements: attack.replacements,
        }),
        markdownComment: getAttackDiscoveryMarkdown({
          attackDiscovery: attack,
          replacements: attack.replacements,
        }),
      })),
    [attachableAttacks]
  );

  const attacksToAttach = useMemo(() => toAttacksToAttach(attachableAttacks), [attachableAttacks]);

  const caseTitle = useMemo(
    () =>
      actionableAttacks.length === 1
        ? actionableAttacks[0].title
        : getSelectionTitle(actionableAttacks.length),
    [actionableAttacks]
  );

  const { items: caseItems } = useAttackCaseContextMenuItems({
    attacksWithCase,
    attacksToAttach,
    closePopover,
    telemetrySource: TELEMETRY_SOURCE,
    title: caseTitle,
  });

  /**
   * Grouped and decorated the way the alerts table's bulk action menu and the attacks page's
   * take-action menu are, so the same verbs read the same wherever they're offered: status first
   * with its coloured dots, then the attack-management verbs, then workflows, then navigation.
   */
  const menuItems = useMemo(
    () =>
      withActionIcons(
        withGroupSeparators([
          withStatusDotIcons(workflowItems, ATTACK_STATUS_ICON_COLORS),
          [...assignItems, ...(attacksWithCase.length > 0 ? caseItems : []), ...tagsItems],
          runWorkflowItems,
          investigateInTimelineItems,
        ]),
        ACTION_ICONS_BY_ID
      ),
    [
      assignItems,
      attacksWithCase.length,
      caseItems,
      investigateInTimelineItems,
      runWorkflowItems,
      tagsItems,
      workflowItems,
    ]
  );

  const selectedLabel = useMemo(
    () =>
      getSelectedLabel(
        numeral(actionableAttacks.length).format(defaultNumberFormat),
        actionableAttacks.length
      ),
    [defaultNumberFormat, actionableAttacks.length]
  );

  const selectAllLabel = useMemo(
    () =>
      areAllAttacksSelected
        ? CLEAR_SELECTION
        : getSelectAllLabel(numeral(totalAttacks).format(defaultNumberFormat), totalAttacks),
    [areAllAttacksSelected, defaultNumberFormat, totalAttacks]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      { id: 0, items: menuItems },
      ...runWorkflowPanels,
      ...workflowPanels,
      ...assignPanels,
      ...tagsPanels,
    ],
    [assignPanels, menuItems, runWorkflowPanels, tagsPanels, workflowPanels]
  );

  // A selection with nothing actionable in it is no selection as far as this bar is concerned.
  if (actionableAttacks.length === 0) {
    return null;
  }

  return (
    <div style={containerStyles} data-test-subj={ATTACK_TAB_BULK_ACTIONS_TEST_ID}>
      {/* A selection allowed to do nothing leaves nothing to open. */}
      {menuItems.length > 0 ? (
        <EuiPopover
          anchorPosition="upLeft"
          aria-label={BULK_ACTIONS_ARIA_LABEL}
          button={
            <EuiButtonEmpty
              color="primary"
              data-test-subj={ATTACK_TAB_BULK_ACTIONS_BUTTON_TEST_ID}
              iconSide="right"
              iconType="chevronSingleDown"
              onClick={togglePopover}
              size="xs"
            >
              {selectedLabel}
            </EuiButtonEmpty>
          }
          closePopover={closePopover}
          id="attackTabBulkActionsPopover"
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
          panelProps={{ 'data-test-subj': ATTACK_TAB_BULK_ACTIONS_POPOVER_TEST_ID }}
          repositionOnScroll
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      ) : null}
      <EuiButtonEmpty
        data-test-subj={ATTACK_TAB_BULK_ACTIONS_SELECT_ALL_TEST_ID}
        iconType={areAllAttacksSelected ? 'cross' : 'pagesSelect'}
        onClick={onToggleSelectAll}
        size="xs"
      >
        {selectAllLabel}
      </EuiButtonEmpty>
    </div>
  );
};

AttackTabBulkActions.displayName = 'AttackTabBulkActions';
