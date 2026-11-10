/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
} from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTextColor,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isNonLocalIndexName } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  ATTACK_TAB_COLUMN_ACTIONS_TEST_ID,
  ATTACK_TAB_ROW_MORE_ACTIONS_POPOVER_TEST_ID,
  ATTACK_TAB_ROW_MORE_ACTIONS_TEST_ID,
  ATTACK_TAB_ROW_SELECT_TEST_ID,
  ATTACK_TAB_ROW_STATUS_TEST_ID,
  ATTACK_TAB_ROW_TITLE_TEST_ID,
  ATTACK_TAB_ROW_UNRESOLVED_TEST_ID,
  ATTACK_TAB_SELECT_ALL_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { getActionsColumnWidth } from '../../../../common/components/header_actions/helpers';
import { TruncatableText } from '../../../../common/components/truncatable_text';
import { RuleStatus } from '../../../../timelines/components/timeline/body/renderers/rule_status';
import { AttacksGroupTakeActionItems } from '../../../../detections/components/attacks/table/attacks_group_take_action_items';
import { ACTION_ICONS_BY_ID } from '../../../../common/utils/action_icons';
import { withActionIcons } from '../../../../common/utils/action_menu_items';
import { getRemoveFromCaseItems } from '../remove_from_case_items';
import { AttackTitleLink } from './attack_title_link';
import { ShowAttackButton } from './show_attack_button';
import { InvestigateAttackInTimelineButton } from './investigate_attack_in_timeline_button';
import type { AttackTabColumnId } from '../utils';
import { ATTACK_TAB_COLUMN_ID, getAttackAlertIds } from '../utils';
import { CELL_TEST_IDS, COLUMN_HEADERS } from './attack_tab_columns';
import { useAttackGridCellContext } from './attack_tab_cell_context';
import type { AttackRow } from './attack_tab_row';
import { getAlertCount, getDetectedOn, getRiskScore, getSummary, getTitle } from './attack_tab_row';

/** Sized like the alerts grid's actions column so the two line up. */
const ACTIONS_COLUMN_WIDTH = getActionsColumnWidth(3);

/** Not an `ATTACK_TAB_COLUMN_ID`, since those key the persisted column picker selection. */
const SELECTION_COLUMN_ID = 'selection';
const SELECTION_COLUMN_WIDTH = 36;

const TELEMETRY_SOURCE = 'case_attachment_table';

const SELECT_ALL_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.selectAllAttacksAriaLabel',
  {
    defaultMessage: 'Select all attacks',
  }
);

const getSelectAttackLabel = (attackTitle: string): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.tab.selectAttackAriaLabel', {
    defaultMessage: 'Select {attackTitle}',
    values: { attackTitle },
  });

const UNRESOLVED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.unresolvedTooltip',
  {
    defaultMessage:
      'This attack could not be loaded. It may have been deleted, aged into a frozen tier, or be outside your access. The details shown were captured when it was attached.',
  }
);

const MORE_ACTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.cases.tab.moreActions',
  {
    defaultMessage: 'More attack actions',
  }
);

/** Clips the summary to one line, matching the alerts grid's rule cell. */
const truncateCss = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** Field names the date cell tooltips show, matching the alerts grid. */
const DETECTED_ON_FIELD_NAME = '@timestamp';
const ATTACHED_AT_FIELD_NAME = 'created_at';

const SelectAllAttacksHeaderCell = () => {
  const { areAllRowsSelected, selectableRowCount, selectedRowCount, toggleAllRowsSelected } =
    useAttackGridCellContext();

  const selectAllId = useGeneratedHtmlId({ prefix: 'attackTabSelectAll' });

  return (
    <EuiCheckbox
      aria-label={SELECT_ALL_LABEL}
      checked={areAllRowsSelected}
      data-test-subj={ATTACK_TAB_SELECT_ALL_TEST_ID}
      disabled={selectableRowCount === 0}
      id={selectAllId}
      indeterminate={selectedRowCount > 0 && !areAllRowsSelected}
      onChange={toggleAllRowsSelected}
    />
  );
};

SelectAllAttacksHeaderCell.displayName = 'SelectAllAttacksHeaderCell';

const SelectAttackCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => {
  const { rows, selectedRowIds, toggleRowSelected } = useAttackGridCellContext();

  const row = rows[rowIndex];

  if (row == null) {
    return null;
  }

  const checkbox = (
    <EuiCheckbox
      aria-label={getSelectAttackLabel(getTitle(row.attack, row.metadata))}
      checked={selectedRowIds.has(row.savedObjectId)}
      data-test-subj={`${ATTACK_TAB_ROW_SELECT_TEST_ID}-${row.savedObjectId}`}
      disabled={row.attack == null}
      id={`${ATTACK_TAB_ROW_SELECT_TEST_ID}-${row.savedObjectId}`}
      onChange={() => toggleRowSelected(row.savedObjectId)}
    />
  );

  // A disabled input emits no mouse events and takes no focus, so the span carries the tooltip.
  return row.isUnresolved ? (
    <EuiToolTip content={UNRESOLVED_TOOLTIP}>
      <span tabIndex={0}>{checkbox}</span>
    </EuiToolTip>
  ) : (
    checkbox
  );
};

SelectAttackCell.displayName = 'SelectAttackCell';

const AttackActionsHeaderCell = () => <>{COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.actions]}</>;

AttackActionsHeaderCell.displayName = 'AttackActionsHeaderCell';

/**
 * The row's overflow menu: the attack flyout's "Take action" items minus navigation, and
 * "Remove from case", which is the only item an unresolved row offers.
 */
const AttackMoreActionsButton = ({
  row,
  onRemoveAttack,
}: {
  row: AttackRow;
  onRemoveAttack?: (attackId: string) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const { attack, attachmentId, savedObjectId } = row;

  const isRemoteDocument = useMemo(() => isNonLocalIndexName(attack?.index ?? ''), [attack?.index]);

  const onRemoveFromCase = useMemo(
    () => (onRemoveAttack != null ? () => onRemoveAttack(attachmentId) : undefined),
    [attachmentId, onRemoveAttack]
  );

  const removeOnlyPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () =>
      onRemoveFromCase != null
        ? [
            {
              id: 0,
              items: withActionIcons(
                getRemoveFromCaseItems({ onRemove: onRemoveFromCase, closePopover }),
                ACTION_ICONS_BY_ID
              ),
            },
          ]
        : [],
    [closePopover, onRemoveFromCase]
  );

  // Every menu item but the removal reads the live document.
  const isDisabled = attack == null && onRemoveFromCase == null;

  const button = (
    <EuiToolTip content={isDisabled ? UNRESOLVED_TOOLTIP : MORE_ACTIONS_LABEL} position="top">
      <EuiButtonIcon
        aria-label={MORE_ACTIONS_LABEL}
        color="text"
        data-test-subj={`${ATTACK_TAB_ROW_MORE_ACTIONS_TEST_ID}-${savedObjectId}`}
        iconType="boxesVertical"
        id={`${savedObjectId}-attack-more-actions`}
        isDisabled={isDisabled}
        onClick={togglePopover}
      />
    </EuiToolTip>
  );

  if (isDisabled) {
    return button;
  }
  return (
    <EuiPopover
      anchorPosition="downLeft"
      aria-label={MORE_ACTIONS_LABEL}
      button={button}
      closePopover={closePopover}
      id={`${savedObjectId}-attack-more-actions-popover`}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
      panelProps={{ 'data-test-subj': ATTACK_TAB_ROW_MORE_ACTIONS_POPOVER_TEST_ID }}
      repositionOnScroll
    >
      {attack != null ? (
        <AttacksGroupTakeActionItems
          attack={attack}
          closePopover={closePopover}
          isRemoteDocument={isRemoteDocument}
          onRemoveFromCase={onRemoveFromCase}
          showAiAssistantAction={false}
          showNavigationAction={false}
          telemetrySource={TELEMETRY_SOURCE}
        />
      ) : (
        <EuiContextMenu initialPanelId={0} panels={removeOnlyPanels} />
      )}
    </EuiPopover>
  );
};

AttackMoreActionsButton.displayName = 'AttackMoreActionsButton';

const AttackActionsCell = ({ rowIndex }: EuiDataGridCellValueElementProps) => {
  const { canInvestigateInTimeline, investigateAttackInTimeline, onRemoveAttack, rows } =
    useAttackGridCellContext();

  const row = rows[rowIndex];

  if (row == null) {
    return null;
  }

  const attackTitle = getTitle(row.attack, row.metadata);

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj={ATTACK_TAB_COLUMN_ACTIONS_TEST_ID}
      gutterSize="xs"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <ShowAttackButton
          id={row.savedObjectId}
          attackId={row.attachmentId}
          indexName={row.attack?.index ?? row.metadata.index}
          attackTitle={attackTitle}
          isDisabled={row.isUnresolved}
        />
      </EuiFlexItem>
      {canInvestigateInTimeline ? (
        <EuiFlexItem grow={false}>
          <InvestigateAttackInTimelineButton
            id={row.savedObjectId}
            isDisabled={getAttackAlertIds(row.attack).length === 0}
            onClick={() => investigateAttackInTimeline(row.attack)}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <AttackMoreActionsButton row={row} onRemoveAttack={onRemoveAttack} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AttackActionsCell.displayName = 'AttackActionsCell';

/**
 * Renders one cell from the live document, falling back to the snapshot. Uses `EuiTextColor`
 * because `EuiText` would override the grid's font size and line height.
 */
const AttackCell = ({
  row,
  columnId,
  isDetails,
}: {
  row: AttackRow;
  columnId: string;
  isDetails: boolean;
}) => {
  const { attack, metadata, isUnresolved } = row;

  const testSubj = CELL_TEST_IDS[columnId as AttackTabColumnId];
  const color = isUnresolved ? 'subdued' : 'default';

  switch (columnId) {
    case ATTACK_TAB_COLUMN_ID.detectedOn: {
      const detectedOn = getDetectedOn(attack, metadata);
      return (
        <EuiTextColor color={color} data-test-subj={testSubj}>
          {detectedOn != null ? (
            <FormattedDate fieldName={DETECTED_ON_FIELD_NAME} value={detectedOn} />
          ) : (
            getEmptyValue()
          )}
        </EuiTextColor>
      );
    }

    case ATTACK_TAB_COLUMN_ID.title: {
      const title = getTitle(attack, metadata);

      // Plain text when unresolved, like the alerts grid's rule cell with no rule to open.
      return isUnresolved ? (
        <EuiToolTip content={UNRESOLVED_TOOLTIP}>
          {/* Focusable so the tooltip is keyboard reachable without a link. */}
          <EuiTextColor
            color={color}
            data-test-subj={ATTACK_TAB_ROW_UNRESOLVED_TEST_ID}
            tabIndex={0}
          >
            <TruncatableText dataTestSubj={testSubj}>
              <span data-test-subj={ATTACK_TAB_ROW_TITLE_TEST_ID}>{title}</span>
            </TruncatableText>
          </EuiTextColor>
        </EuiToolTip>
      ) : (
        <AttackTitleLink
          attackId={row.attachmentId}
          indexName={attack?.index ?? metadata.index}
          title={title}
        />
      );
    }

    case ATTACK_TAB_COLUMN_ID.alerts: {
      const alertCount = getAlertCount(attack, metadata);
      return (
        <EuiTextColor color={color} data-test-subj={testSubj}>
          {alertCount ?? getEmptyValue()}
        </EuiTextColor>
      );
    }

    case ATTACK_TAB_COLUMN_ID.summary: {
      const summary = getSummary(attack, metadata);
      return (
        <EuiTextColor
          color={color}
          component="div"
          css={isDetails ? undefined : truncateCss}
          data-test-subj={testSubj}
        >
          {summary ?? getEmptyValue()}
        </EuiTextColor>
      );
    }

    case ATTACK_TAB_COLUMN_ID.riskScore: {
      const riskScore = getRiskScore(attack, metadata);
      return (
        <EuiTextColor color={color} data-test-subj={testSubj}>
          {riskScore ?? getEmptyValue()}
        </EuiTextColor>
      );
    }

    case ATTACK_TAB_COLUMN_ID.status:
      return (
        <EuiTextColor color={color} data-test-subj={testSubj}>
          <span data-test-subj={ATTACK_TAB_ROW_STATUS_TEST_ID}>
            {attack?.alertWorkflowStatus != null ? (
              <RuleStatus value={attack.alertWorkflowStatus} />
            ) : (
              getEmptyValue()
            )}
          </span>
        </EuiTextColor>
      );

    case ATTACK_TAB_COLUMN_ID.attachedBy:
      return (
        <EuiTextColor color={color} data-test-subj={testSubj}>
          {row.attachedBy}
        </EuiTextColor>
      );

    case ATTACK_TAB_COLUMN_ID.attachedAt:
      return (
        <EuiTextColor color={color} data-test-subj={testSubj}>
          <FormattedDate fieldName={ATTACHED_AT_FIELD_NAME} value={row.createdAt} />
        </EuiTextColor>
      );

    default:
      return null;
  }
};

AttackCell.displayName = 'AttackCell';

export const AttackGridCell = ({
  rowIndex,
  columnId,
  isDetails,
}: EuiDataGridCellValueElementProps) => {
  const { rows } = useAttackGridCellContext();

  const row = rows[rowIndex];

  return row != null ? <AttackCell row={row} columnId={columnId} isDetails={isDetails} /> : null;
};

AttackGridCell.displayName = 'AttackGridCell';

export const LEADING_CONTROL_COLUMNS: EuiDataGridControlColumn[] = [
  {
    id: SELECTION_COLUMN_ID,
    width: SELECTION_COLUMN_WIDTH,
    headerCellRender: SelectAllAttacksHeaderCell,
    rowCellRender: SelectAttackCell,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.actions,
    width: ACTIONS_COLUMN_WIDTH,
    headerCellRender: AttackActionsHeaderCell,
    rowCellRender: AttackActionsCell,
  },
];
