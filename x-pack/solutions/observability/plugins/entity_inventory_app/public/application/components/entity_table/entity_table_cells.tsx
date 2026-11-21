/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiScreenReaderOnly, EuiText } from '@elastic/eui';
import moment from 'moment';
import type {
  DynamicMetricUnit,
  ESQLValue,
  OutputColumnKind,
} from '@kbn/entity-inventory-plugin/common';
import { formatCellValue } from '../../utils/format_cell_value';
import { formatMetricValue } from '../../utils/format_metric_value';
import { METRIC_NOT_AVAILABLE_LABEL, NO_VALUE_LABEL } from './translations';

/** Placeholder for a cell without a value; screen readers hear "No value". */
export const EmptyCellValue = () => (
  <EuiText color="subdued" size="s">
    <span aria-hidden={true}>-</span>
    <EuiScreenReaderOnly>
      <span>{NO_VALUE_LABEL}</span>
    </EuiScreenReaderOnly>
  </EuiText>
);

/** Visible N/A for a metric cell without a value. */
export const MetricNotAvailable = () => (
  <EuiText color="subdued" size="s">
    {METRIC_NOT_AVAILABLE_LABEL}
  </EuiText>
);

interface CellRendererProps {
  value: ESQLValue | undefined;
  dateFormat: string;
  unit?: DynamicMetricUnit;
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

const MetricCell = ({ value, unit }: CellRendererProps) => {
  const text = formatMetricValue(value, unit);
  return text === null ? <MetricNotAvailable /> : <>{text}</>;
};

/** The renderer of each column kind; a kind without an entry renders as text. */
const CELL_RENDERER_BY_KIND: Readonly<
  Partial<Record<OutputColumnKind, React.FC<CellRendererProps>>>
> = {
  last_seen: DateCell,
  metric: MetricCell,
};

export interface EntityCellProps extends CellRendererProps {
  kind: OutputColumnKind | undefined;
}

/** A cell rendered by its column's kind, or the placeholder when empty. */
export const EntityCell = ({
  value,
  kind,
  dateFormat,
  unit,
}: EntityCellProps): React.ReactElement => {
  const Renderer = (kind && CELL_RENDERER_BY_KIND[kind]) ?? TextCell;
  return <Renderer value={value} dateFormat={dateFormat} unit={unit} />;
};
