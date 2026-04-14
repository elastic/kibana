/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { copyToClipboard, EuiButtonIcon, EuiFlexGroup, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type {
  CellActionRenderer,
  CellActionRendererProps,
} from '../flyout_v2/shared/components/cell_actions';

type DiscoverCellActionRendererDeps = Pick<
  DocViewRenderProps,
  'columns' | 'filter' | 'onAddColumn' | 'onRemoveColumn'
>;

const filterForValueLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.filterForValue',
  {
    defaultMessage: 'Filter for value',
  }
);

const filterOutValueLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.filterOutValue',
  {
    defaultMessage: 'Filter out value',
  }
);

const filterForFieldPresentLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.filterForFieldPresent',
  {
    defaultMessage: 'Filter for field present',
  }
);

const toggleColumnLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.toggleColumn',
  {
    defaultMessage: 'Toggle column in table',
  }
);

const copyToClipboardLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.copyToClipboard',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

const fieldValueActionsLabel = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.ariaLabel',
  {
    defaultMessage: 'Field value actions',
  }
);

const closePopoverPlaceholder = () => {};

const DiscoverCellActions = ({
  children,
  field,
  value,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: CellActionRendererProps & DiscoverCellActionRendererDeps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isColumnAdded = columns?.includes(field) ?? false;
  const copyValue = typeof value === 'string' ? value : JSON.stringify(value) ?? '';

  const actions = [];

  if (filter) {
    actions.push(
      {
        id: 'filterIn',
        iconType: 'plusCircle',
        label: filterForValueLabel,
        onClick: () => filter(field, value, '+'),
      },
      {
        id: 'filterOut',
        iconType: 'minusCircle',
        label: filterOutValueLabel,
        onClick: () => filter(field, value, '-'),
      },
      {
        id: 'filterExists',
        iconType: 'filter',
        label: filterForFieldPresentLabel,
        onClick: () => filter('_exists_', field, '+'),
      }
    );
  }

  if (onAddColumn || onRemoveColumn) {
    actions.push({
      id: 'toggleColumn',
      iconType: isColumnAdded ? 'cross' : 'plusCircle',
      label: toggleColumnLabel,
      onClick: () => (isColumnAdded ? onRemoveColumn?.(field) : onAddColumn?.(field)),
    });
  }

  actions.push({
    id: 'copyToClipboard',
    iconType: 'copy',
    label: copyToClipboardLabel,
    onClick: () => copyToClipboard(copyValue),
  });

  if (actions.length === 0) {
    return <>{children}</>;
  }

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
        button={children}
        isOpen={isPopoverOpen}
        anchorPosition="downCenter"
        closePopover={closePopoverPlaceholder}
        panelPaddingSize="s"
        panelStyle={{ minWidth: '24px' }}
        display="inline-block"
        aria-label={fieldValueActionsLabel}
      >
        <EuiFlexGroup wrap gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          {actions.map((action) => (
            <EuiToolTip content={action.label} key={action.id} disableScreenReaderOutput>
              <EuiButtonIcon
                data-test-subj={`securitySolutionOneDiscoverCellAction-${action.id}`}
                size="xs"
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

export const createDiscoverCellActionRenderer = ({
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DiscoverCellActionRendererDeps): CellActionRenderer => {
  const Renderer: CellActionRenderer = (props) => (
    <DiscoverCellActions
      {...props}
      columns={columns}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
    />
  );
  Renderer.displayName = 'DiscoverCellActionRenderer';
  return Renderer;
};
