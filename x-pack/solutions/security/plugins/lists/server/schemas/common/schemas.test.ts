/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';

import {
  EsDataTypeGeoPoint,
  EsDataTypeGeoPointRange,
  EsDataTypeRange,
  EsDataTypeRangeTerm,
  EsDataTypeSingle,
  EsDataTypeUnion,
  esDataTypeGeoPoint,
  esDataTypeGeoPointRange,
  esDataTypeRange,
  esDataTypeRangeTerm,
  esDataTypeSingle,
  esDataTypeUnion,
} from './schemas';

describe('esDataTypeUnion', () => {
  test('it will work with a regular union', () => {
    const payload: EsDataTypeUnion = { boolean: 'true' };
    const decoded = esDataTypeUnion.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will not work with a madeup value', () => {
    const payload: EsDataTypeUnion & { madeupValue: 'madeupValue' } = {
      boolean: 'true',
      madeupValue: 'madeupValue',
    };
    const decoded = esDataTypeUnion.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupValue"']);
    expect(message.schema).toEqual({});
  });
});

describe('esDataTypeRange', () => {
  test('it will work with a given gte, lte range', () => {
    const payload: EsDataTypeRange = { gte: '127.0.0.1', lte: '127.0.0.1' };
    const decoded = esDataTypeRange.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value', () => {
    const payload: EsDataTypeRange & { madeupvalue: string } = {
      gte: '127.0.0.1',
      lte: '127.0.0.1',
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRange.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });
});

describe('esDataTypeRangeTerm', () => {
  test('it will work with a date_range', () => {
    const payload: EsDataTypeRangeTerm = { date_range: { gte: '2015', lte: '2017' } };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value for date_range', () => {
    const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
      date_range: { gte: '2015', lte: '2017' },
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a double_range', () => {
    const payload: EsDataTypeRangeTerm = { double_range: { gte: '2015', lte: '2017' } };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value for double_range', () => {
    const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
      double_range: { gte: '2015', lte: '2017' },
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a float_range', () => {
    const payload: EsDataTypeRangeTerm = { float_range: { gte: '2015', lte: '2017' } };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value for float_range', () => {
    const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
      float_range: { gte: '2015', lte: '2017' },
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a integer_range', () => {
    const payload: EsDataTypeRangeTerm = { integer_range: { gte: '2015', lte: '2017' } };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value for integer_range', () => {
    const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
      integer_range: { gte: '2015', lte: '2017' },
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a ip_range', () => {
    const payload: EsDataTypeRangeTerm = { ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' } };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will work with a ip_range as a CIDR', () => {
    const payload: EsDataTypeRangeTerm = { ip_range: '127.0.0.1/16' };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value for ip_range', () => {
    const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
      ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a long_range', () => {
    const payload: EsDataTypeRangeTerm = { long_range: { gte: '2015', lte: '2017' } };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value for long_range', () => {
    const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
      long_range: { gte: '2015', lte: '2017' },
      madeupvalue: 'something',
    };
    const decoded = esDataTypeRangeTerm.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });
});

describe('esDataTypeGeoPointRange', () => {
  test('it will work with a given lat, lon range', () => {
    const payload: EsDataTypeGeoPointRange = { lat: '20', lon: '30' };
    const decoded = esDataTypeGeoPointRange.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value', () => {
    const payload: EsDataTypeGeoPointRange & { madeupvalue: string } = {
      lat: '20',
      lon: '30',
      madeupvalue: 'something',
    };
    const decoded = esDataTypeGeoPointRange.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });
});

describe('esDataTypeGeoPoint', () => {
  test('it will work with a given lat, lon range', () => {
    const payload: EsDataTypeGeoPoint = { geo_point: { lat: '127.0.0.1', lon: '127.0.0.1' } };
    const decoded = esDataTypeGeoPoint.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will work with a WKT (Well known text)', () => {
    const payload: EsDataTypeGeoPoint = { geo_point: 'POINT (30 10)' };
    const decoded = esDataTypeGeoPoint.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given an extra madeup value', () => {
    const payload: EsDataTypeGeoPoint & { madeupvalue: string } = {
      geo_point: 'POINT (30 10)',
      madeupvalue: 'something',
    };
    const decoded = esDataTypeGeoPoint.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
    expect(message.schema).toEqual({});
  });
});

describe('esDataTypeSingle', () => {
  test('it will work with single type', () => {
    const payload: EsDataTypeSingle = { boolean: 'true' };
    const decoded = esDataTypeSingle.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will not work with a madeup value', () => {
    const payload: EsDataTypeSingle & { madeupValue: 'madeup' } = {
      boolean: 'true',
      madeupValue: 'madeup',
    };
    const decoded = esDataTypeSingle.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupValue"']);
    expect(message.schema).toEqual({});
  });
});
