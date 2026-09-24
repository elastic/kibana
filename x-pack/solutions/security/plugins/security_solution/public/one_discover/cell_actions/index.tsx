/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldActionsProvider, useUIFieldActions } from '@kbn/unified-doc-viewer';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { CellActionRendererProps } from '../../flyout_v2/shared/components/cell_actions';

type DiscoverCellActionRendererDeps = Pick<
  DocViewRenderProps,
  'columns' | 'filter' | 'onAddColumn' | 'onRemoveColumn'
>;

type DiscoverCellActionsPanelProps = Omit<DiscoverCellActionsProps, 'columns'>;

const fieldValueActionsLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.ariaLabel',
  {
    defaultMessage: 'Field value actions',
  }
);

const closePopoverPlaceholder = () => {};

const FILTER_ACTION_IDS = new Set([
  'addFilterInAction',
  'addFilterOutremoveFromFilterAction',
  'addFilterExistAction',
]);

const TOGGLE_COLUMN_ACTION_ID = 'toggleFieldColumnAction';

const ACTION_TEST_SUBJ_IDS: Record<string, string> = {
  addFilterInAction: 'filterIn',
  addFilterOutremoveFromFilterAction: 'filterOut',
  addFilterExistAction: 'filterExists',
  toggleFieldColumnAction: 'toggleColumn',
  copyToClipboardAction: 'copyToClipboard',
};

/**
 * Renders Discover cell action buttons in a popover. This component is used as the content of the popover, while the anchor is provided by the caller (DiscoverCellActions).
 */
const DiscoverCellActionsPanel = ({
  children,
  field,
  value,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DiscoverCellActionsPanelProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
      }
    };
  }, []);

  const copyValue = typeof value === 'string' ? value : JSON.stringify(value) ?? '';
  const actions = useUIFieldActions({ field, value, formattedValue: copyValue });
  const visibleActions = useMemo(
    () =>
      actions.filter(({ id }) => {
        if (FILTER_ACTION_IDS.has(id)) {
          return Boolean(filter);
        }
        if (id === TOGGLE_COLUMN_ACTION_ID) {
          return Boolean(onAddColumn || onRemoveColumn);
        }
        return true;
      }),
    [actions, filter, onAddColumn, onRemoveColumn]
  );

  const onMouseEnter = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
    }

    setIsPopoverOpen(true);
  };

  const onMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setIsPopoverOpen(false), 100);
  };

  return (
    <span
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-test-subj="securitySolutionOneDiscoverCellActions"
    >
      <EuiPopover
        button={<>{children}</>}
        isOpen={isPopoverOpen}
        anchorPosition="downCenter"
        closePopover={closePopoverPlaceholder}
        panelPaddingSize="xs"
        panelStyle={{ minWidth: '24px' }}
        display="inline-block"
        aria-label={fieldValueActionsLabel}
      >
        <EuiFlexGroup wrap gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          {visibleActions.map((action) => (
            <EuiToolTip content={action.label} key={action.id} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj={`securitySolutionOneDiscoverCellAction-${
                  ACTION_TEST_SUBJ_IDS[action.id] ?? action.id
                }`}
                size="xs"
                iconSize="s"
                iconType={action.iconType}
                aria-label={action.label}
                onClick={() => {
                  setIsPopoverOpen(false);
                  action.onClick();
                }}
              />
            </EuiToolTip>
          ))}
        </EuiFlexGroup>
      </EuiPopover>
    </span>
  );
};

interface DiscoverCellActionsProps {
  /**
   * Cell value content rendered as the popover anchor.
   */
  children: CellActionRendererProps['children'];
  /**
   * Name of the Discover field for the current cell.
   */
  field: CellActionRendererProps['field'];
  /**
   * Raw value from the current Discover cell.
   */
  value: CellActionRendererProps['value'];
  /**
   * Fields currently displayed as Discover table columns.
   */
  columns: DiscoverCellActionRendererDeps['columns'];
  /**
   * Adds include, exclude, or exists filters for the field value.
   * */
  filter: DiscoverCellActionRendererDeps['filter'];
  /**
   * Adds the field to the Discover table columns.
   */
  onAddColumn: DiscoverCellActionRendererDeps['onAddColumn'];
  /**
   * Removes the field from the Discover table columns.
   */
  onRemoveColumn: DiscoverCellActionRendererDeps['onRemoveColumn'];
}

/**
 * Wraps Discover cell values with hover actions for filtering, column toggling, and copying.
 */
export const DiscoverCellActions = ({ columns, ...panelProps }: DiscoverCellActionsProps) => (
  <FieldActionsProvider
    columns={columns}
    filter={panelProps.filter}
    onAddColumn={panelProps.onAddColumn}
    onRemoveColumn={panelProps.onRemoveColumn}
  >
    <DiscoverCellActionsPanel {...panelProps} />
  </FieldActionsProvider>
);
