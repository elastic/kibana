/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sortBy } from 'lodash/fp';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

interface GetTableTabItemsProps {
  /**
   * Array of data formatted for field browser
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Object of fields by name
   */
  fieldsByName: { [fieldName: string]: Partial<FieldSpec> };
}

/**
 * Returns the sorted items for the table tab
 */
export const getTableTabItems: (props: GetTableTabItemsProps) => TimelineEventsDetailsItem[] = ({
  dataFormattedForFieldBrowser,
  fieldsByName,
}: GetTableTabItemsProps) => {
  const sortedItems = sortBy(['field'], dataFormattedForFieldBrowser).map((item, i) => ({
    ...item,
    ...fieldsByName[item.field],
    valuesConcatenated: item.values != null ? item.values.join() : '',
    ariaRowindex: i + 1,
  }));

  return sortedItems;
};
