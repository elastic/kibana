/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isSemverValid from 'semver/functions/valid';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { validateProvider, isProviderValid } from './helpers';
import type { Provider } from './use_insight_data_providers';

const mockDataViewFieldSpec = {
  name: 'data view',
  type: 'string',
  searchable: true,
  aggregatable: false,
};

const mockProvider: Provider = {
  field: 'field',
  excluded: false,
  queryType: 'phrase',
  value: 'value',
  valueType: 'string',
};

describe('Filter validation utils', () => {
  describe('validateProvider', () => {
    it('should return false if value or value type is null', () => {
      const dataViewField = new DataViewField(mockDataViewFieldSpec);
      expect(validateProvider(dataViewField, '', 'string')).toBe(false);
      expect(validateProvider(dataViewField, 'text', 'undefined')).toBe(false);
      expect(validateProvider(dataViewField, undefined)).toBe(false);
    });

    it('should validate value correctly when type is date', () => {
      const dataViewField = new DataViewField({ ...mockDataViewFieldSpec, type: 'date' });
      expect(validateProvider(dataViewField, '45621', 'string')).toBe(true);
      expect(validateProvider(dataViewField, 'Jan 2022', 'string')).toBe(true);
      expect(validateProvider(dataViewField, 'Jun 28, 2023 @ 00:00:00.000', 'string')).toBe(true);
      expect(validateProvider(dataViewField, '4562100000', 'string')).toBe(false);
      expect(validateProvider(dataViewField, 'date text', 'string')).toBe(false);
      expect(validateProvider(dataViewField, true, 'boolean')).toBe(false);
    });

    it('should validate value correctly when type is ip', () => {
      const dataViewField = new DataViewField({ ...mockDataViewFieldSpec, type: 'ip' });
      expect(validateProvider(dataViewField, '123.000.000', 'string')).toBe(true);
      expect(validateProvider(dataViewField, '123215672', 'string')).toBe(true);
      expect(validateProvider(dataViewField, '123.000', 'string')).toBe(true);
      expect(validateProvider(dataViewField, 123215672, 'number')).toBe(true);
      expect(validateProvider(dataViewField, '12345678910', 'string')).toBe(false);
      expect(validateProvider(dataViewField, 'text', 'string')).toBe(false);
      expect(validateProvider(dataViewField, true, 'boolean')).toBe(false);
    });

    it('should validate value correctly when type is string and esType available', () => {
      const dataViewField = new DataViewField({
        ...mockDataViewFieldSpec,
        type: 'string',
      });
      expect(validateProvider(dataViewField, 'host.name', 'string')).toBe(true);
      expect(validateProvider(dataViewField, '123', 'string')).toBe(true);
      expect(validateProvider(dataViewField, true, 'boolean')).toBe(false);
      expect(validateProvider(dataViewField, 123, 'number')).toBe(false);
    });

    it('should validate value correctly when type is string and esType has ES type versions', () => {
      const dataViewField = new DataViewField({
        ...mockDataViewFieldSpec,
        type: 'string',
        esTypes: ['keyword', 'version'],
      });
      expect(validateProvider(dataViewField, 'host.name', 'string')).toBe(
        Boolean(isSemverValid('host.name'))
      );
      expect(validateProvider(dataViewField, '123', 'string')).toBe(Boolean(isSemverValid('123')));
      expect(validateProvider(dataViewField, true, 'boolean')).toBe(false);
      expect(validateProvider(dataViewField, 123, 'number')).toBe(false);
    });

    it('should validate value correctly when type is boolean', () => {
      const dataViewField = new DataViewField({
        ...mockDataViewFieldSpec,
        type: 'boolean',
      });
      expect(validateProvider(dataViewField, true, 'boolean')).toBe(true);
      expect(validateProvider(dataViewField, false, 'boolean')).toBe(true);
      expect(validateProvider(dataViewField, 'host.name', 'string')).toBe(false);
      expect(validateProvider(dataViewField, '123', 'string')).toBe(false);
      expect(validateProvider(dataViewField, 123, 'number')).toBe(false);
    });

    it('should validate value correctly when type is number', () => {
      const dataViewField = new DataViewField({
        ...mockDataViewFieldSpec,
        type: 'number',
      });
      expect(validateProvider(dataViewField, 123, 'number')).toBe(true);
      expect(validateProvider(dataViewField, '123', 'number')).toBe(true);
      expect(validateProvider(dataViewField, 'host.name', 'string')).toBe(false);
    });
  });

  describe('isProviderValid', () => {
    const dataViewField = new DataViewField(mockDataViewFieldSpec);
    const dataViewFieldHostName = new DataViewField({
      ...mockDataViewFieldSpec,
      name: 'host.name',
      type: 'string',
    });
    const dataViewFieldHostIP = new DataViewField({
      ...mockDataViewFieldSpec,
      name: 'host.ip',
      type: 'ip',
    });
    const dataViewFieldCount = new DataViewField({
      ...mockDataViewFieldSpec,
      name: 'count',
      type: 'number',
    });

    const mockPhrasesProvider = { ...mockProvider, queryType: 'phrases' };
    const mockRangeProvider = { ...mockProvider, queryType: 'range' };
    const mockExistProvider = { ...mockProvider, queryType: 'exists' };

    it('should return false if dataViewField or field name is empty', () => {
      expect(isProviderValid(mockProvider, undefined)).toBe(false);
      expect(isProviderValid({ ...mockProvider, field: '' }, dataViewField)).toBe(false);
    });

    describe('should validate phrases query correctly', () => {
      it('should validate string field type correctly', () => {
        expect(
          isProviderValid(
            {
              ...mockPhrasesProvider,
              field: 'host.name',
              value: JSON.stringify(['host1', 'host2']),
            },
            dataViewFieldHostName
          )
        ).toBe(true);
        expect(
          isProviderValid(
            { ...mockPhrasesProvider, field: 'host.name', value: JSON.stringify([]) },
            dataViewFieldHostName
          )
        ).toBe(false);
      });

      it('should validate ip field type correctly', () => {
        expect(
          isProviderValid(
            {
              ...mockPhrasesProvider,
              field: 'host.ip',
              value: JSON.stringify([123, '123.000.000']),
            },
            dataViewFieldHostIP
          )
        ).toBe(true);
        expect(
          isProviderValid(
            {
              ...mockPhrasesProvider,
              field: 'host.ip',
              value: JSON.stringify([123, 'random text']),
            },
            dataViewFieldHostIP
          )
        ).toBe(false);
        expect(
          isProviderValid(
            { ...mockPhrasesProvider, field: 'host.ip', value: JSON.stringify('123, random text') },
            dataViewFieldHostIP
          )
        ).toBe(false);
      });

      it('should validate number field type correctly', () => {
        expect(
          isProviderValid(
            { ...mockPhrasesProvider, field: 'count', value: JSON.stringify([123, 456]) },
            dataViewFieldCount
          )
        ).toBe(true);
        expect(
          isProviderValid(
            { ...mockPhrasesProvider, field: 'count', value: JSON.stringify('123, 456') },
            dataViewFieldCount
          )
        ).toBe(false);
        expect(
          isProviderValid(
            { ...mockPhrasesProvider, field: 'count', value: JSON.stringify([123, true]) },
            dataViewFieldCount
          )
        ).toBe(false);
      });
    });

    describe('should validate range query correctly', () => {
      it('should return false if value is not object type', () => {
        expect(
          isProviderValid(
            { ...mockRangeProvider, field: 'host.ip', value: JSON.stringify('gte:120.000') },
            dataViewFieldHostIP
          )
        ).toBe(false);
      });

      it('should validate ip field type correctly', () => {
        expect(
          isProviderValid(
            { ...mockRangeProvider, field: 'host.ip', value: JSON.stringify({ gte: 120.0 }) },
            dataViewFieldHostIP
          )
        ).toBe(true);
        expect(
          isProviderValid(
            {
              ...mockRangeProvider,
              field: 'host.ip',
              value: JSON.stringify({ gte: 120.0, lt: 'text' }),
            },
            dataViewFieldHostIP
          )
        ).toBe(false);
      });

      it('should validate number field type correctly', () => {
        expect(
          isProviderValid(
            { ...mockRangeProvider, field: 'count', value: JSON.stringify({ gte: 12, lt: 40 }) },
            dataViewFieldCount
          )
        ).toBe(true);
        expect(
          isProviderValid(
            { ...mockRangeProvider, field: 'count', value: JSON.stringify({}) },
            dataViewFieldCount
          )
        ).toBe(true);
        expect(
          isProviderValid(
            {
              ...mockRangeProvider,
              field: 'count',
              value: JSON.stringify({ gte: 120, lt: 'text' }),
            },
            dataViewFieldCount
          )
        ).toBe(false);
      });
    });

    it('should validate exist query correctly', () => {
      expect(isProviderValid({ ...mockExistProvider, field: 'host.ip' }, dataViewFieldHostIP)).toBe(
        true
      );
      expect(isProviderValid({ ...mockExistProvider, field: '' }, dataViewFieldHostIP)).toBe(false);
    });
  });
});
