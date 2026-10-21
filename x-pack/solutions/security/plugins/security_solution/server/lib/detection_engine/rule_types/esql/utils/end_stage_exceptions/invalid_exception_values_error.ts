/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkippedItem } from './types';

/** The message of a rule status is a line of text, so only the first items are named. */
const MAX_NAMED_REASONS = 5;

const describeItem = ({ item, explanation, fields }: SkippedItem): string =>
  `"${item.name}" (list "${item.list_id}", item "${item.item_id}"): ${explanation}${
    fields?.length ? `, in the field "${fields.join('", "')}"` : ''
  }`;

/** Thrown before the query runs when an item has a value that cannot be written at the end of the query for the type of its column. */
export class InvalidExceptionValuesError extends Error {
  public readonly invalidItems: readonly SkippedItem[];

  constructor(invalidItems: readonly SkippedItem[]) {
    const named = invalidItems.slice(0, MAX_NAMED_REASONS).map(describeItem).join('; ');
    const others =
      invalidItems.length > MAX_NAMED_REASONS
        ? ` and ${invalidItems.length - MAX_NAMED_REASONS} more`
        : '';
    super(
      `The rule did not run because exception items have a value that cannot be used for the type of the field: ${named}${others}. Fix or delete these exception items.`
    );
    this.name = 'InvalidExceptionValuesError';
    this.invalidItems = invalidItems;
  }
}
