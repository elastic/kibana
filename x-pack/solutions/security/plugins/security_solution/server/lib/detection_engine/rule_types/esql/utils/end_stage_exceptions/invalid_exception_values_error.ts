/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkippedItem } from './types';

/** The message of a rule status is a line of text, so only the first items are named. */
const MAX_NAMED_ITEMS = 5;

const describeItem = ({ item, reason, fields }: SkippedItem): string =>
  `"${item.name}" (list "${item.list_id}", item "${item.item_id}"): ${reason}${
    fields?.length ? `, in the field "${fields.join('", "')}"` : ''
  }`;

/**
 * Thrown before the query runs when an exception item compares a column with a value that is not valid for its
 * type. The DSL filter fails the request for the same values, and a rule that failed is better than a rule that
 * runs with only some of its exceptions and creates alerts that the exceptions were meant to exclude.
 */
export class InvalidExceptionValuesError extends Error {
  public readonly invalidItems: readonly SkippedItem[];

  constructor(invalidItems: readonly SkippedItem[]) {
    const named = invalidItems.slice(0, MAX_NAMED_ITEMS).map(describeItem).join('; ');
    const others =
      invalidItems.length > MAX_NAMED_ITEMS
        ? ` and ${invalidItems.length - MAX_NAMED_ITEMS} more`
        : '';
    super(
      `The rule did not run because exception items have a value that is not valid for the type of the field: ${named}${others}. Fix or delete these exception items.`
    );
    this.name = 'InvalidExceptionValuesError';
    this.invalidItems = invalidItems;
  }
}
