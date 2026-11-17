/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndStageItem } from './types';

const MAX_NAMED_ITEMS = 5;

const describeItem = ({ item }: EndStageItem): string =>
  `"${item.name}" (list "${item.list_id}", item "${item.item_id}")`;

/**
 * The warning for the exceptions that are true for every row. The rule runs and the exceptions exclude every row, as an exception
 * with only an exclusive operator on a field that no document has does in the DSL filter, and the warning tells the user why the rule
 * creates no alerts. It is `undefined` when no exception does that.
 */
export const buildExcludeEveryRowWarning = (
  endStageItems: readonly EndStageItem[]
): string | undefined => {
  const items = endStageItems.filter(({ excludesEveryRow }) => excludesEveryRow);
  if (items.length === 0) {
    return undefined;
  }
  const named = items.slice(0, MAX_NAMED_ITEMS).map(describeItem).join('; ');
  const others =
    items.length > MAX_NAMED_ITEMS ? ` and ${items.length - MAX_NAMED_ITEMS} more` : '';
  return `The rule creates no alerts because exceptions exclude every row: ${named}${others}. Each condition of these exceptions has an exclusive operator on a column that the query does not output, which is true for every row. Remove the exceptions from the rule, or add a condition on a column that the query outputs.`;
};
