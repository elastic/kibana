/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { addIdToItem } from '@kbn/securitysolution-utils';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

import type { ThreatMapping } from '../../../../common/api/detection_engine/model/rule_schema';

import type { Entry, FormattedEntry, ThreatMapEntries, EmptyEntry } from './types';

/**
 * Formats the entry into one that is easily usable for the UI.
 */
export const getFormattedEntry = (
  dataView: DataViewBase,
  threatDataView: DataViewBase,
  item: Entry,
  itemIndex: number,
  uuidGen: () => string = uuidv4
): FormattedEntry => {
  const { fields } = dataView;
  const { fields: threatFields } = threatDataView;
  const field = item.field;
  const threatField = item.value;
  const [foundField] = fields.filter(({ name }) => field != null && field === name);
  const [threatFoundField] = threatFields.filter(
    ({ name }) => threatField != null && threatField === name
  );
  const maybeId: typeof item & { id?: string } = item;

  // Fallback to a string field when field isn't found in known fields.
  // It's required for showing field's value when appropriate data is missing in ES.
  return {
    id: maybeId.id ?? uuidGen(),
    field: foundField ?? {
      name: field,
      type: 'string',
    },
    type: 'mapping',
    value: threatFoundField ?? {
      name: threatField,
      type: 'string',
    },
    entryIndex: itemIndex,
    negate: item.negate ?? false, // Default to false if negate is not provided
  };
};

/**
 * Formats the entries to be easily usable for the UI
 *
 * @param patterns DataViewBase containing available fields on rule index
 * @param entries item entries
 */
export const getFormattedEntries = (
  indexPattern: DataViewBase,
  threatIndexPatterns: DataViewBase,
  entries: Entry[]
): FormattedEntry[] => {
  return entries.reduce<FormattedEntry[]>((acc, item, index) => {
    const newItemEntry = getFormattedEntry(indexPattern, threatIndexPatterns, item, index);
    return [...acc, newItemEntry];
  }, []);
};

/**
 * Determines whether an entire entry or item need to be removed
 *
 * @param item
 * @param entryIndex index of given entry
 *
 */
export const getUpdatedEntriesOnDelete = (
  item: ThreatMapEntries,
  entryIndex: number
): ThreatMapEntries => {
  return {
    ...item,
    entries: [...item.entries.slice(0, entryIndex), ...item.entries.slice(entryIndex + 1)],
  };
};

/**
 * Determines proper entry update when user selects new field
 *
 * @param item - current item entry values
 * @param newField - newly selected field
 *
 */
export const getEntryOnFieldChange = (
  item: FormattedEntry,
  newField: DataViewFieldBase
): { updatedEntry: Entry; index: number } => {
  const { entryIndex } = item;
  return {
    updatedEntry: {
      id: item.id,
      field: newField != null ? newField.name : '',
      type: 'mapping',
      value: item.value != null ? item.value.name : '',
      negate: item.negate ?? false,
    } as Entry, // Cast to Entry since id is only used as a react key prop and can be ignored elsewhere
    index: entryIndex,
  };
};

/**
 * Determines proper entry update when user selects new field
 *
 * @param item - current item entry values
 * @param newField - newly selected field
 *
 */
export const getEntryOnThreatFieldChange = (
  item: FormattedEntry,
  newField: DataViewFieldBase
): { updatedEntry: Entry; index: number } => {
  const { entryIndex } = item;
  return {
    updatedEntry: {
      id: item.id,
      field: item.field != null ? item.field.name : '',
      type: 'mapping',
      value: newField != null ? newField.name : '',
      negate: item.negate ?? false,
    } as Entry, // Cast to Entry since id is only used as a react key prop and can be ignored elsewhere
    index: entryIndex,
  };
};

export const getEntryOnMatchChange = (
  item: FormattedEntry,
  newNegate: boolean
): { updatedEntry: Entry & { id: string }; index: number } => {
  const { entryIndex, field, value, id } = item;
  return {
    updatedEntry: {
      id,
      field: field?.name ?? '',
      type: 'mapping',
      value: value?.name ?? '',
      negate: newNegate ?? false,
    },
    index: entryIndex,
  };
};

export const createAndNewEntryItem = (): EmptyEntry => {
  return addIdToItem({
    field: '',
    type: 'mapping',
    value: '',
    negate: false,
  });
};

export const createOrNewEntryItem = (): ThreatMapping['0'] => {
  return addIdToItem({
    entries: [
      addIdToItem({
        field: '',
        type: 'mapping',
        value: '',
        negate: false,
      }),
    ],
  });
};

/**
 * Given a list of items checks each one to see if any of them have an empty field
 * or an empty value.
 * @param items The items to check if we have an empty entries.
 */
export const containsInvalidItems = (items: ThreatMapEntries[]): boolean => {
  return items.some((item) =>
    item.entries.some((subEntry) => subEntry.field === '' || subEntry.value === '')
  );
};

/**
 * Given a list of items checks if we have a single empty entry and if we do returns true.
 * @param items The items to check if we have a single empty entry.
 */
export const singleEntryThreat = (items: ThreatMapEntries[]): boolean => {
  return (
    items.length === 1 &&
    items[0].entries.length === 1 &&
    items[0].entries[0].field === '' &&
    items[0].entries[0].value === ''
  );
};

/**
 * Not match field clause can not use same mapping fields as match clause in same AND condition.
 * This function checks if there are any entries that have a negate=true(DOES_NOT_MATCH)
 * and MATCH clause with the same field and value in the item(ThreatMapEntries)
 *
 * For example:
 *@example
 *```
 * user.name MATCHES threat.indicator.user.name
 * AND
 * user.name DOES_NOT_MATCH threat.indicator.user.name
 *```
 * is not allowed.
 */
export const containsInvalidDoesNotMatchEntries = (items: ThreatMapEntries[]): boolean => {
  return items.some((item) => {
    const hasNegate = item.entries.some((subEntry) => subEntry.negate === true);
    if (!hasNegate) {
      return false;
    }

    const negateSet = new Set(
      item.entries
        .filter(({ negate, field, value }) => negate && field && value)
        .map((subEntry) => `${subEntry.field}-${subEntry.value}`)
    );

    return item.entries.some(
      ({ field, value, negate }) =>
        field && value && negate !== true && negateSet.has(`${field}-${value}`)
    );
  });
};

/**
 * Checks if there are any entries that have a single entry with negate set to true(DOES_NOT_MATCH)
 */
export const containsSingleDoesNotMatchEntry = (items: ThreatMapEntries[]): boolean => {
  return items.some((item) => {
    return item.entries.length === 1 && item.entries[0].negate === true;
  });
};
