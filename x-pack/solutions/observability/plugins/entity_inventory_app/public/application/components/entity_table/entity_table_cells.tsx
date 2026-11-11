/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiScreenReaderOnly, EuiText } from '@elastic/eui';
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

interface CellRendererProps {
  value: InventoryCellValue | undefined;
  dateFormat: string;
}

const TextCell = ({ value }: CellRendererProps) => {
  const text = formatCellValue(value);
  return text === null ? <EmptyCellValue /> : <>{text}</>;
};

const DateCell = ({ value, dateFormat }: CellRendererProps) =>
  typeof value === 'string' ? (
    <>{moment(value).format(dateFormat)}</>
  ) : (
    <TextCell value={value} dateFormat={dateFormat} />
  );

/** The renderer of each column kind; a kind without an entry renders as text. */
const CELL_RENDERER_BY_KIND: Readonly<
  Partial<Record<InventoryOutputColumnKind, React.FC<CellRendererProps>>>
> = {
  last_seen: DateCell,
};

export interface EntityCellProps extends CellRendererProps {
  kind: InventoryOutputColumnKind | undefined;
}

/** A cell rendered by its column's kind, or the placeholder when empty. */
export const EntityCell = ({ value, kind, dateFormat }: EntityCellProps): React.ReactElement => {
  const Renderer = (kind && CELL_RENDERER_BY_KIND[kind]) ?? TextCell;
  return <Renderer value={value} dateFormat={dateFormat} />;
};
