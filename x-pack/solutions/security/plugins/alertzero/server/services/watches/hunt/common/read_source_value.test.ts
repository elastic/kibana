/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  countDistinctSourceValues,
  readSourceNumber,
  readSourceString,
  readSourceStrings,
  readSourceValue,
} from './read_source_value';

const nested = { host: { name: 'h1' }, process: { pid: 42 }, event: { type: ['start', 'info'] } };
const flat = { 'host.name': 'h1', 'process.pid': 42, 'event.type': ['start', 'info'] };

describe('readSourceValue', () => {
  it.each([
    ['nested', nested],
    ['flat (columnar)', flat],
  ])('reads the same value from a %s _source', (_shape, source) => {
    expect(readSourceValue(source, 'host.name')).toBe('h1');
    expect(readSourceValue(source, 'process.pid')).toBe(42);
  });

  it('prefers a flat key over a nested path', () => {
    expect(readSourceValue({ 'host.name': 'flat', host: { name: 'nested' } }, 'host.name')).toBe(
      'flat'
    );
  });

  it('returns undefined when the field is absent or the path crosses a non-object', () => {
    expect(readSourceValue(flat, 'host.hostname')).toBeUndefined();
    expect(readSourceValue({ host: 'not-an-object' }, 'host.name')).toBeUndefined();
    expect(readSourceValue({ host: [{ name: 'in-array' }] }, 'host.name')).toBeUndefined();
  });
});

describe('typed readers', () => {
  it.each([
    ['nested', nested],
    ['flat (columnar)', flat],
  ])('read strings, the first string and numbers from a %s _source', (_shape, source) => {
    expect(readSourceString(source, 'host.name')).toBe('h1');
    expect(readSourceStrings(source, 'event.type')).toEqual(['start', 'info']);
    expect(readSourceNumber(source, 'process.pid')).toBe(42);
  });

  it('takes the first element of a multi-valued field and skips wrong types', () => {
    expect(readSourceString({ 'host.name': ['a', 'b'] }, 'host.name')).toBe('a');
    expect(readSourceString({ 'host.name': 7 }, 'host.name')).toBeUndefined();
    expect(readSourceNumber({ 'process.pid': '42' }, 'process.pid')).toBeUndefined();
  });

  it('treats a scalar as a one-element list and a missing field as empty', () => {
    expect(readSourceStrings({ 'event.type': 'start' }, 'event.type')).toEqual(['start']);
    expect(readSourceStrings({}, 'event.type')).toEqual([]);
  });
});

describe('countDistinctSourceValues', () => {
  it.each([
    ['a scalar', { 'process.pid': 42 }, 1],
    ['a one-element array', { process: { pid: [42] } }, 1],
    ['repeated identical values', { 'process.pid': [42, 42] }, 1],
    ['different values', { 'process.pid': [42, 43] }, 2],
    ['an absent field', { 'host.name': 'h1' }, 0],
  ])('counts %s', (_label, source, expected) => {
    expect(countDistinctSourceValues(source, 'process.pid')).toBe(expected);
  });
});
