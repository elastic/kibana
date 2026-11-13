/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
} from '@elastic/eui';
import moment from 'moment';
import type { InventoryCellValue, InventoryOutputColumnKind } from '../../../inventory_api/types';
import { formatCellValue } from '../../utils/format_cell_value';
import { NO_VALUE_LABEL } from './translations';

/** Placeholder for a cell without a value; screen readers hear "No value". */
export const EmptyCellValue = () => (
  <EuiText color="subdued" size="s">
    <span aria-hidden={true}>—</span>
    <EuiScreenReaderOnly>
      <span>{NO_VALUE_LABEL}</span>
    </EuiScreenReaderOnly>
  </EuiText>
);

export interface EntityNameCellProps {
  name: string | null;
  iconType: IconType;
}

/** The entity name with the icon of its type. */
export const EntityNameCell = ({ name, iconType }: EntityNameCellProps) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={iconType} aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem>{name ?? <EmptyCellValue />}</EuiFlexItem>
  </EuiFlexGroup>
);

export interface EntityCellProps {
  value: InventoryCellValue | undefined;
  kind: InventoryOutputColumnKind | undefined;
  isBadge: boolean;
  dateFormat: string;
}

/** A value cell: a formatted date, a badge, plain text, or the placeholder when empty. */
export const EntityCell = ({ value, kind, isBadge, dateFormat }: EntityCellProps) => {
  if (kind === 'last_seen' && typeof value === 'string') {
    return <>{moment(value).format(dateFormat)}</>;
  }

  const text = formatCellValue(value);
  if (text === null) {
    return <EmptyCellValue />;
  }

  return isBadge ? (
    <EuiBadge color="hollow" data-test-subj="entityInventoryCellBadge">
      {text}
    </EuiBadge>
  ) : (
    <>{text}</>
  );
};
