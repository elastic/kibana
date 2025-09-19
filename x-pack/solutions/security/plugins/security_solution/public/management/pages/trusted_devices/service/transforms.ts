/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
  EntryMatch,
  EntryMatchWildcard,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type { AllConditionEntryFields } from '@kbn/securitysolution-utils';
import { TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';
import type { ConditionEntry } from '../../../../../common/endpoint/types';

const OPERATOR_VALUE = 'included';

const createTrustedDeviceEntryMatch = (field: string, value: string): EntryMatch => {
  return { field, value, type: 'match', operator: OPERATOR_VALUE };
};

const createTrustedDeviceEntryWildcard = (field: string, value: string): EntryMatchWildcard => {
  return { field, value, type: 'wildcard', operator: OPERATOR_VALUE };
};

export const entriesToTrustedDeviceConditions = (entries: EntriesArray): ConditionEntry[] => {
  const result: ConditionEntry[] = [];

  entries.forEach((entry) => {
    if (!isTrustedDeviceField(entry.field as string)) {
      return; // Skip non-TD fields
    }

    if (entry.type === 'match' && 'value' in entry) {
      result.push({
        field: entry.field as unknown as AllConditionEntryFields,
        value: entry.value,
        type: entry.type,
        operator: 'included',
      });
    } else if (entry.type === 'wildcard' && 'value' in entry) {
      result.push({
        field: entry.field as unknown as AllConditionEntryFields,
        value: entry.value,
        type: entry.type,
        operator: 'included',
      });
    } else if (entry.type === 'match_any' && 'value' in entry && Array.isArray(entry.value)) {
      result.push({
        field: entry.field as unknown as AllConditionEntryFields,
        value: entry.value,
        type: entry.type,
        operator: 'included',
      });
    }
  });

  return result;
};

export const trustedDeviceConditionsToEntries = (conditions: ConditionEntry[]): EntriesArray => {
  const entriesArray: EntriesArray = [];

  conditions.forEach((condition) => {
    if (!isTrustedDeviceField(condition.field)) {
      return;
    }

    if (condition.type === 'match') {
      entriesArray.push(createTrustedDeviceEntryMatch(condition.field, condition.value as string));
    } else if (condition.type === 'wildcard') {
      entriesArray.push(
        createTrustedDeviceEntryWildcard(condition.field, condition.value as string)
      );
    } else if (condition.type === 'match_any' && Array.isArray(condition.value)) {
      entriesArray.push({
        field: condition.field,
        value: condition.value,
        type: 'match_any',
        operator: OPERATOR_VALUE,
      });
    }
  });

  return entriesArray;
};

export const isTrustedDeviceField = (field: string): boolean => {
  return Object.values(TrustedDeviceConditionEntryField).includes(
    field as TrustedDeviceConditionEntryField
  );
};

export const readTransform = (item: ExceptionListItemSchema): ExceptionListItemSchema => {
  return {
    ...item,
    entries: entriesToTrustedDeviceConditions(item.entries) as ExceptionListItemSchema['entries'],
  };
};

export const writeTransform = <
  T extends CreateExceptionListItemSchema | UpdateExceptionListItemSchema
>(
  item: T
): T => {
  return {
    ...item,
    entries: trustedDeviceConditionsToEntries(item.entries as ConditionEntry[]),
  } as T;
};
