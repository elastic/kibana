/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields, getField } from '@kbn/data-plugin/common/mocks';
import type { FormattedEntry } from './types';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { DataViewBase } from '@kbn/es-query';
import moment from 'moment-timezone';
import type {
  ThreatMapping,
  ThreatMappingEntry,
} from '../../../../common/api/detection_engine/model/rule_schema';
import {
  getEntryOnFieldChange,
  getFormattedEntries,
  getFormattedEntry,
  getUpdatedEntriesOnDelete,
} from './helpers';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

const getMockIndexPattern = (): DataViewBase =>
  ({
    id: '1234',
    title: 'logstash-*',
    fields,
  } as DataViewBase);

const getMockEntry = (): FormattedEntry => ({
  id: '123',
  field: getField('ip'),
  value: getField('ip'),
  type: 'mapping',
  entryIndex: 0,
});

describe('Helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
    jest.clearAllMocks();
  });

  describe('#getFormattedEntry', () => {
    test('returns fields found in dataViews', () => {
      const dataView: DataViewBase = {
        title: 'test1-*',
        fields: [
          {
            name: 'fieldA.name',
            type: 'string',
            esTypes: ['text'],
          },
        ],
      };
      const threatMatchDataView: DataViewBase = {
        title: 'test2-*',
        fields: [
          {
            name: 'fieldB.name',
            type: 'string',
            esTypes: ['text'],
          },
        ],
      };

      const payloadItem: ThreatMappingEntry = {
        field: 'fieldA.name',
        type: 'mapping',
        value: 'fieldB.name',
      };

      expect(getFormattedEntry(dataView, threatMatchDataView, payloadItem, 0)).toMatchObject({
        field: {
          name: 'fieldA.name',
          type: 'string',
          esTypes: ['text'],
        },
        value: {
          name: 'fieldB.name',
          type: 'string',
          esTypes: ['text'],
        },
      });
    });

    test('returns fallback values when fields not found in dataViews', () => {
      const dataView: DataViewBase = {
        title: 'test1-*',
        fields: [],
      };
      const threatMatchDataView: DataViewBase = {
        title: 'test2-*',
        fields: [],
      };

      const payloadItem: ThreatMappingEntry = {
        field: 'fieldA.name',
        type: 'mapping',
        value: 'fieldB.name',
      };

      expect(getFormattedEntry(dataView, threatMatchDataView, payloadItem, 0)).toMatchObject({
        field: {
          name: 'fieldA.name',
          type: 'string',
        },
        value: {
          name: 'fieldB.name',
          type: 'string',
        },
      });
    });

    test('returns entry parameters', () => {
      const dataView: DataViewBase = {
        title: 'test1-*',
        fields: [],
      };
      const threatMatchDataView: DataViewBase = {
        title: 'test2-*',
        fields: [],
      };

      const payloadItem: ThreatMappingEntry = {
        field: 'unknown',
        type: 'mapping',
        value: 'unknown',
      };

      expect(getFormattedEntry(dataView, threatMatchDataView, payloadItem, 3)).toMatchObject({
        entryIndex: 3,
        type: 'mapping',
      });
    });
  });

  describe('#getFormattedEntries', () => {
    test('returns formatted entry with fallback field and value if it unable to find a matching index pattern field', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: ThreatMappingEntry[] = [
        { field: 'field.one', type: 'mapping', value: 'field.two' },
      ];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          negate: false,
          entryIndex: 0,
          field: {
            name: 'field.one',
            type: 'string',
          },
          value: {
            name: 'field.two',
            type: 'string',
          },
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns a fallback value if cannot match a pattern field', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: ThreatMappingEntry[] = [
        { field: 'machine.os', type: 'mapping', value: 'yolo' },
      ];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          negate: false,
          entryIndex: 0,
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          value: {
            name: 'yolo',
            type: 'string',
          },
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns value and field when they match two independent index patterns', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const threatIndexPattern = getMockIndexPattern();
      const payloadItems: ThreatMappingEntry[] = [
        { field: 'machine.os', type: 'mapping', value: 'machine.os' },
      ];
      const output = getFormattedEntries(payloadIndexPattern, threatIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          negate: false,
          entryIndex: 0,
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          value: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries', () => {
      const payloadIndexPattern: DataViewBase = getMockIndexPattern();
      const payloadItems: ThreatMappingEntry[] = [
        { field: 'machine.os', type: 'mapping', value: 'machine.os' },
        { field: 'ip', type: 'mapping', value: 'ip' },
      ];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          negate: false,
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          type: 'mapping',
          value: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          entryIndex: 0,
        },
        {
          id: '123',
          negate: false,
          field: {
            name: 'ip',
            type: 'ip',
            esTypes: ['ip'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
          },
          type: 'mapping',
          value: {
            name: 'ip',
            type: 'ip',
            esTypes: ['ip'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
          },
          entryIndex: 1,
        },
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('#getUpdatedEntriesOnDelete', () => {
    test('it removes entry corresponding to "entryIndex"', () => {
      const payloadItem: ThreatMapping[number] = {
        entries: [
          { field: 'field.one', type: 'mapping', value: 'field.one' },
          { field: 'field.two', type: 'mapping', value: 'field.two' },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0);
      const expected: ThreatMapping[number] = {
        entries: [
          {
            field: 'field.two',
            type: 'mapping',
            value: 'field.two',
          },
        ],
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnFieldChange', () => {
    test('it returns field of type "match" with updated field', () => {
      const payloadItem = getMockEntry();
      const payloadIFieldType = getField('ip');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: ThreatMappingEntry & { id: string }; index: number } = {
        index: 0,
        updatedEntry: {
          id: '123',
          field: 'ip',
          type: 'mapping',
          value: 'ip',
          negate: false,
        },
      };
      expect(output).toEqual(expected);
    });
  });
});
