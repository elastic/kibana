/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import { copyToClipboard, EuiButtonIcon, EuiFlexGroup, EuiPopover, EuiToolTip } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { CellActionFieldValue } from '../common/components/cell_actions';
import type {
  CellActionRenderer,
  CellActionRendererProps,
} from '../flyout_v2/shared/components/cell_actions';

interface DiscoverCellActionRendererDeps {
  columns?: string[];
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
}

interface DiscoverCellAction {
  id: string;
  iconType: IconType;
  label: string;
  onClick: () => void;
}

interface DiscoverCellActionsProps
  extends CellActionRendererProps,
    DiscoverCellActionRendererDeps {}

const FILTER_FOR_VALUE_LABEL = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.filterForValue',
  {
    defaultMessage: 'Filter for value',
  }
);

const FILTER_OUT_VALUE_LABEL = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.filterOutValue',
  {
    defaultMessage: 'Filter out value',
  }
);

const FILTER_FOR_FIELD_PRESENT_LABEL = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.filterForFieldPresent',
  {
    defaultMessage: 'Filter for field present',
  }
);

const TOGGLE_COLUMN_LABEL = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.toggleColumn',
  {
    defaultMessage: 'Toggle column in table',
  }
);

const COPY_TO_CLIPBOARD_LABEL = i18n.translate(
  'xpack.securitySolution.oneDiscover.flyoutCellActions.copyToClipboard',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

const getCopyValue = (value: CellActionFieldValue): string => {
  if (Array.isArray(value)) {
    return value.map((item) => (item == null ? '' : String(item))).join(', ');
  }

  if (value == null) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const hasFilterableValue = (value: CellActionFieldValue): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined && value !== '';
};

const DiscoverCellActions = ({
  children,
  field,
  value,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DiscoverCellActionsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isColumnAdded = columns?.includes(field) ?? false;
  const shouldShowToggleColumn =
    columns != null &&
    ((isColumnAdded && onRemoveColumn != null) || (!isColumnAdded && onAddColumn != null));

  const actions = useMemo<DiscoverCellAction[]>(() => {
    const nextActions: DiscoverCellAction[] = [];

    if (filter && hasFilterableValue(value)) {
      nextActions.push(
        {
          id: 'filterIn',
          iconType: 'plusCircle',
          label: FILTER_FOR_VALUE_LABEL,
          onClick: () => filter(field, value, '+'),
        },
        {
          id: 'filterOut',
          iconType: 'minusCircle',
          label: FILTER_OUT_VALUE_LABEL,
          onClick: () => filter(field, value, '-'),
        }
      );
    }

    if (filter) {
      nextActions.push({
        id: 'filterExists',
        iconType: 'filter',
        label: FILTER_FOR_FIELD_PRESENT_LABEL,
        onClick: () => filter('_exists_', field, '+'),
      });
    }

    if (shouldShowToggleColumn) {
      nextActions.push({
        id: 'toggleColumn',
        iconType: isColumnAdded ? 'cross' : 'plusCircle',
        label: TOGGLE_COLUMN_LABEL,
        onClick: () => {
          if (isColumnAdded) {
            onRemoveColumn?.(field);
          } else {
            onAddColumn?.(field);
          }
        },
      });
    }

    if (hasFilterableValue(value)) {
      nextActions.push({
        id: 'copyToClipboard',
        iconType: 'copy',
        label: COPY_TO_CLIPBOARD_LABEL,
        onClick: () => copyToClipboard(getCopyValue(value)),
      });
    }

    return nextActions;
  }, [field, filter, isColumnAdded, onAddColumn, onRemoveColumn, shouldShowToggleColumn, value]);

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
        button={React.isValidElement(children) ? children : <span>{children}</span>}
        isOpen={isPopoverOpen}
        anchorPosition="downCenter"
        closePopover={closePopoverPlaceholder}
        panelPaddingSize="s"
        panelStyle={{ minWidth: '24px' }}
        display="inline-block"
        aria-label={i18n.translate(
          'xpack.securitySolution.oneDiscover.flyoutCellActions.ariaLabel',
          {
            defaultMessage: 'Field value actions',
          }
        )}
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

const closePopoverPlaceholder = () => {};

export const createDiscoverCellActionRenderer = ({
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DiscoverCellActionRendererDeps): CellActionRenderer => {
  const DiscoverCellActionRenderer = (props: CellActionRendererProps) => (
    <DiscoverCellActions
      {...props}
      columns={columns}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
    />
  );

  DiscoverCellActionRenderer.displayName = 'DiscoverCellActionRenderer';

  return DiscoverCellActionRenderer;
};

DiscoverCellActions.displayName = 'DiscoverCellActions';
