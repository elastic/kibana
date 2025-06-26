/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash/fp';
import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { TableTabState } from '../tabs/table_tab';

interface ItemsEntry {
  pinnedRows: TimelineEventsDetailsItem[];
  restRows: TimelineEventsDetailsItem[];
}

interface GetTableItemsProps {
  /**
   * Array of data formatted for field browser
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Object of fields by name
   */
  fieldsByName: { [fieldName: string]: Partial<FieldSpec> };
  /**
   * Array of highlighted fields
   */
  highlightedFields: string[];
  /**
   * Table tab state
   */
  tableTabState: TableTabState;
}

export const getTableItems: (props: GetTableItemsProps) => TimelineEventsDetailsItem[] = ({
  dataFormattedForFieldBrowser,
  fieldsByName,
  highlightedFields,
  tableTabState,
}: GetTableItemsProps) => {
  const { pinnedFields, showHighlightedFields, hideEmptyFields, hideAlertFields } = tableTabState;
  const pinnedFieldsSet = new Set(pinnedFields);

  const sortedFields = sortBy(['field'], dataFormattedForFieldBrowser).map((item, i) => ({
    ...item,
    ...fieldsByName[item.field],
    valuesConcatenated: item.values != null ? item.values.join() : '',
    ariaRowindex: i + 1,
    isPinned: pinnedFieldsSet.has(item.field),
  }));

  const { pinnedRows, restRows } = sortedFields.reduce<ItemsEntry>(
    (acc, curField) => {
      // Hide empty fields
      if (hideEmptyFields && curField.valuesConcatenated === '') {
        return acc;
      }

      // Hide alert fields
      if (
        hideAlertFields &&
        (curField.field.startsWith(ALERT_NAMESPACE) || curField.field.startsWith('signal.'))
      ) {
        return acc;
      }

      // Process highlighted fields
      if (showHighlightedFields && !highlightedFields.includes(curField.field)) {
        return acc;
      }

      // Process pinned fields when showHighlightedFields is false
      if (curField.isPinned) {
        acc.pinnedRows.push(curField);
      } else {
        acc.restRows.push(curField);
      }
      return acc;
    },
    {
      pinnedRows: [],
      restRows: [],
    }
  );
  return [...pinnedRows, ...restRows];
};
