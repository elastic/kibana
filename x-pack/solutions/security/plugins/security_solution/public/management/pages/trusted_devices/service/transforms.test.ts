/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  EntryMatch,
  EntryMatchWildcard,
  EntryMatchAny,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type { AllConditionEntryFields } from '@kbn/securitysolution-utils';
import { TrustedDeviceConditionEntryField } from '@kbn/securitysolution-utils';
import type { ConditionEntry } from '../../../../../common/endpoint/types';
import {
  entriesToTrustedDeviceConditions,
  trustedDeviceConditionsToEntries,
  isTrustedDeviceField,
  readTransform,
  writeTransform,
} from './transforms';

const makeMatch = (field: string, value: string): EntryMatch => ({
  field,
  value,
  type: 'match',
  operator: 'included',
});

const makeWildcard = (field: string, value: string): EntryMatchWildcard => ({
  field,
  value,
  type: 'wildcard',
  operator: 'included',
});

const makeMatchAny = (field: string, value: string[]): EntryMatchAny => ({
  field,
  value,
  type: 'match_any',
  operator: 'included',
});

describe('trusted devices transforms', () => {
  describe('isTrustedDeviceField', () => {
    it('returns true for all trusted device fields', () => {
      for (const field of Object.values(TrustedDeviceConditionEntryField)) {
        expect(isTrustedDeviceField(field)).toBe(true);
      }
    });

    it('returns false for non-trusted device fields', () => {
      expect(isTrustedDeviceField('process.name')).toBe(false);
    });
  });

  describe('entriesToTrustedDeviceConditions', () => {
    it('converts entries to trusted device conditions and filters out non-TD fields', () => {
      const entries: EntriesArray = [
        makeMatch(TrustedDeviceConditionEntryField.USERNAME, 'alice'),
        makeWildcard(TrustedDeviceConditionEntryField.HOST, 'host-*'),
        makeMatchAny(TrustedDeviceConditionEntryField.DEVICE_ID, ['dev-1', 'dev-2']),
        makeMatch('process.name', 'cat.exe'), // non TD → filtered out
      ];

      const result = entriesToTrustedDeviceConditions(entries);

      const expected: ConditionEntry[] = [
        {
          field: TrustedDeviceConditionEntryField.USERNAME as unknown as AllConditionEntryFields,
          value: 'alice',
          type: 'match',
          operator: 'included',
        },
        {
          field: TrustedDeviceConditionEntryField.HOST as unknown as AllConditionEntryFields,
          value: 'host-*',
          type: 'wildcard',
          operator: 'included',
        },
        {
          field: TrustedDeviceConditionEntryField.DEVICE_ID as unknown as AllConditionEntryFields,
          value: ['dev-1', 'dev-2'],
          type: 'match_any',
          operator: 'included',
        },
      ];

      expect(result).toEqual(expected);
    });
  });

  describe('trustedDeviceConditionsToEntries', () => {
    it('converts conditions to entries and filters out non-TD fields', () => {
      const conditions: ConditionEntry[] = [
        {
          field: TrustedDeviceConditionEntryField.USERNAME as unknown as AllConditionEntryFields,
          value: 'bob',
          type: 'match',
          operator: 'included',
        },
        {
          field:
            TrustedDeviceConditionEntryField.MANUFACTURER as unknown as AllConditionEntryFields,
          value: 'Acme*',
          type: 'wildcard',
          operator: 'included',
        },
        {
          field: TrustedDeviceConditionEntryField.PRODUCT_ID as unknown as AllConditionEntryFields,
          value: ['p1', 'p2'],
          type: 'match_any',
          operator: 'included',
        },
        {
          field: 'process.name' as unknown as AllConditionEntryFields,
          value: 'bad.exe',
          type: 'match',
          operator: 'included',
        },
      ];

      const result = trustedDeviceConditionsToEntries(conditions);

      const expected: EntriesArray = [
        makeMatch(TrustedDeviceConditionEntryField.USERNAME, 'bob'),
        makeWildcard(TrustedDeviceConditionEntryField.MANUFACTURER, 'Acme*'),
        makeMatchAny(TrustedDeviceConditionEntryField.PRODUCT_ID, ['p1', 'p2']),
      ];

      expect(result).toEqual(expected);
    });
  });

  describe('readTransform', () => {
    it('maps entries to trusted device conditions on the item', () => {
      const entries: EntriesArray = [
        makeMatch(TrustedDeviceConditionEntryField.USERNAME, 'carol'),
        makeWildcard(TrustedDeviceConditionEntryField.HOST, 'lab-*'),
        makeMatch('process.name', 'ignored.exe'),
      ];
      const item = { entries } as unknown as ExceptionListItemSchema;

      const transformed = readTransform(item);

      const expectedConditions: ConditionEntry[] = [
        {
          field: TrustedDeviceConditionEntryField.USERNAME as unknown as AllConditionEntryFields,
          value: 'carol',
          type: 'match',
          operator: 'included',
        },
        {
          field: TrustedDeviceConditionEntryField.HOST as unknown as AllConditionEntryFields,
          value: 'lab-*',
          type: 'wildcard',
          operator: 'included',
        },
      ];

      expect(transformed.entries as unknown as ConditionEntry[]).toEqual(expectedConditions);
    });

    it('preserves all item properties unchanged while transforming entries', () => {
      const entries: EntriesArray = [
        makeMatch(TrustedDeviceConditionEntryField.USERNAME, 'test-user'),
      ];

      const item = {
        id: 'test-id-123',
        name: 'Test Trusted Device',
        description: 'Test device description',
        os_types: ['windows', 'macos'],
        tags: ['tag1', 'tag2'],
        meta: {
          created_by: 'test-user',
          updated_by: 'admin',
          custom_field: 'custom_value',
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        created_by: 'test-creator',
        updated_by: 'test-updater',
        tie_breaker_id: 'tie-breaker-123',
        version: 1,
        entries,
      } as unknown as ExceptionListItemSchema;

      const transformed = readTransform(item);

      // Test that all properties except entries are preserved exactly
      expect(transformed.id).toBe(item.id);
      expect(transformed.name).toBe(item.name);
      expect(transformed.description).toBe(item.description);
      expect(transformed.os_types).toBe(item.os_types);
      expect(transformed.tags).toBe(item.tags);
      expect(transformed.meta).toBe(item.meta);
      expect(transformed.created_at).toBe(item.created_at);
      expect(transformed.updated_at).toBe(item.updated_at);
      expect(transformed.created_by).toBe(item.created_by);
      expect(transformed.updated_by).toBe(item.updated_by);
      expect(transformed.tie_breaker_id).toBe(item.tie_breaker_id);

      // Test that entries are transformed (not preserved)
      expect(transformed.entries).not.toBe(item.entries);
      expect(transformed.entries as unknown as ConditionEntry[]).toEqual([
        {
          field: TrustedDeviceConditionEntryField.USERNAME as unknown as AllConditionEntryFields,
          value: 'test-user',
          type: 'match',
          operator: 'included',
        },
      ]);
    });
  });

  describe('writeTransform', () => {
    it('maps trusted device conditions back to entries on the item', () => {
      const conditions: ConditionEntry[] = [
        {
          field: TrustedDeviceConditionEntryField.USERNAME as unknown as AllConditionEntryFields,
          value: 'dave',
          type: 'match',
          operator: 'included',
        },
        {
          field: TrustedDeviceConditionEntryField.DEVICE_ID as unknown as AllConditionEntryFields,
          value: ['x', 'y'],
          type: 'match_any',
          operator: 'included',
        },
      ];

      const item = { entries: conditions } as unknown as CreateExceptionListItemSchema;
      const updated = writeTransform(item);

      const expected: EntriesArray = [
        makeMatch(TrustedDeviceConditionEntryField.USERNAME, 'dave'),
        makeMatchAny(TrustedDeviceConditionEntryField.DEVICE_ID, ['x', 'y']),
      ];

      expect(updated.entries).toEqual(expected);
    });

    it('preserves all item properties unchanged while transforming entries', () => {
      const conditions: ConditionEntry[] = [
        {
          field: TrustedDeviceConditionEntryField.HOST as unknown as AllConditionEntryFields,
          value: 'test-host',
          type: 'match',
          operator: 'included',
        },
      ];

      const item = {
        name: 'Create Test Device',
        description: 'Device for creation test',
        os_types: ['linux'],
        tags: ['create-tag'],
        meta: {
          source: 'api',
          priority: 'high',
        },
        comments: [{ comment: 'Test comment' }],
        item_id: 'create-item-id',
        entries: conditions,
      } as unknown as CreateExceptionListItemSchema;

      const transformed = writeTransform(item);

      // Test that all properties except entries are preserved exactly
      expect(transformed.name).toBe(item.name);
      expect(transformed.description).toBe(item.description);
      expect(transformed.os_types).toBe(item.os_types);
      expect(transformed.tags).toBe(item.tags);
      expect(transformed.meta).toBe(item.meta);
      expect(transformed.comments).toBe(item.comments);
      expect(transformed.item_id).toBe(item.item_id);

      // Test that entries are transformed (not preserved)
      expect(transformed.entries).not.toBe(item.entries);
      expect(transformed.entries).toEqual([
        makeMatch(TrustedDeviceConditionEntryField.HOST, 'test-host'),
      ]);
    });
  });
});
