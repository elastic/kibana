/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { head } from 'lodash/fp';
import React from 'react';
import type { Filter } from '@kbn/es-query';

import type { ColumnHeaderOptions } from '../../../../../../common/types';
import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { ColumnRenderer } from './column_renderer';
import { FormattedFieldValue } from './formatted_field';

export const dataExistsAtColumn = (columnName: string, data: TimelineNonEcsData[]): boolean =>
  data.findIndex((item) => item.field === columnName) !== -1;

export const plainColumnRenderer: ColumnRenderer = {
  isInstance: (columnName: string, data: TimelineNonEcsData[]) =>
    dataExistsAtColumn(columnName, data),
  renderColumn: ({
    asPlainText,
    columnName,
    eventId,
    field,
    scopeId,
    truncate,
    values,
    linkValues,
  }: {
    asPlainText?: boolean;
    columnName: string;
    eventId?: string;
    field: ColumnHeaderOptions;
    globalFilters?: Filter[];
    scopeId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
    linkValues?: string[] | null | undefined;
  }) => {
    if (!Array.isArray(values) || values.length === 0) {
      return getEmptyTagValue();
    }

    // In case the column isn't draggable, fields are joined
    // to give users a faster overview of all values.
    // (note: the filter-related hover actions still produce individual filters for each value)
    return (
      <FormattedFieldValue
        asPlainText={asPlainText}
        contextId={`plain-column-renderer-formatted-field-value-${scopeId}`}
        eventId={eventId}
        fieldFormat={typeof field.format === 'string' ? field.format : field?.format?.id ?? ''}
        fieldName={columnName}
        isAggregatable={field.aggregatable ?? false}
        fieldType={field.type ?? ''}
        key={`plain-column-renderer-formatted-field-value-${scopeId}-${columnName}-${eventId}-${field.id}`}
        linkValue={head(linkValues)}
        truncate={truncate}
        value={joinValues(values)}
      />
    );
  },
};

function joinValues(values: string[] | undefined | null): string | undefined | null {
  if (Array.isArray(values)) {
    if (values.length > 0) {
      return values.join(', ');
    } else {
      return values[0];
    }
  }
  return values;
}
