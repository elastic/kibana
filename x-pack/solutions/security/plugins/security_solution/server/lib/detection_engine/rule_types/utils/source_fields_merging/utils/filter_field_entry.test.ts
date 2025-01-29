/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterFieldEntry } from './filter_field_entry';

describe('filter_field_entry', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /** Dummy test value */
  const dummyValue = ['value'];

  test('returns true for a valid field entry', () => {
    const fieldsKeys: string[] = ['foo.bar'];
    expect(filterFieldEntry(['foo.bar', dummyValue], fieldsKeys, {}, [])).toEqual(true);
  });

  test('returns false for invalid dotted entries', () => {
    const fieldsKeys: string[] = ['.', 'foo.bar', '..', 'foo..bar'];
    expect(filterFieldEntry(['.', dummyValue], fieldsKeys, {}, [])).toEqual(false);
    expect(filterFieldEntry(['foo.bar', dummyValue], fieldsKeys, {}, [])).toEqual(true);
    expect(filterFieldEntry(['..', dummyValue], fieldsKeys, {}, [])).toEqual(false);
    expect(filterFieldEntry(['foo..bar', dummyValue], fieldsKeys, {}, [])).toEqual(false);
  });

  test('removes multi-field values such "foo.keyword" mixed with "foo" and prefers just "foo" for 1st level', () => {
    const fieldsKeys: string[] = [
      'foo',
      'foo.keyword', // <-- "foo.keyword" multi-field should be removed
      'bar.keyword', // <-- "bar.keyword" multi-field should be removed
      'bar',
    ];
    expect(filterFieldEntry(['foo', dummyValue], fieldsKeys, {}, [])).toEqual(true);
    expect(filterFieldEntry(['foo.keyword', dummyValue], fieldsKeys, {}, [])).toEqual(false);
    expect(filterFieldEntry(['bar.keyword', dummyValue], fieldsKeys, {}, [])).toEqual(false);
    expect(filterFieldEntry(['bar', dummyValue], fieldsKeys, {}, [])).toEqual(true);
  });

  test('removes multi-field values such "host.name.keyword" mixed with "host.name" and prefers just "host.name" for 2nd level', () => {
    const fieldsKeys: string[] = [
      'host.name',
      'host.name.keyword', // <-- multi-field should be removed
      'host.hostname',
      'host.hostname.keyword', // <-- multi-field should be removed
    ];
    expect(filterFieldEntry(['host.name', dummyValue], fieldsKeys, {}, [])).toEqual(true);
    expect(filterFieldEntry(['host.name.keyword', dummyValue], fieldsKeys, {}, [])).toEqual(false);
    expect(filterFieldEntry(['host.hostname', dummyValue], fieldsKeys, {}, [])).toEqual(true);
    expect(filterFieldEntry(['host.hostname.keyword', dummyValue], fieldsKeys, {}, [])).toEqual(
      false
    );
  });

  test('removes multi-field values such "foo.host.name.keyword" mixed with "foo.host.name" and prefers just "foo.host.name" for 3rd level', () => {
    const fieldsKeys: string[] = [
      'foo.host.name',
      'foo.host.name.keyword', // <-- multi-field should be removed
      'foo.host.hostname',
      'foo.host.hostname.keyword', // <-- multi-field should be removed
    ];
    expect(filterFieldEntry(['foo.host.name', dummyValue], fieldsKeys, {}, [])).toEqual(true);
    expect(filterFieldEntry(['foo.host.name.keyword', dummyValue], fieldsKeys, {}, [])).toEqual(
      false
    );
    expect(filterFieldEntry(['foo.host.hostname', dummyValue], fieldsKeys, {}, [])).toEqual(true);
    expect(filterFieldEntry(['foo.host.hostname.keyword', dummyValue], fieldsKeys, {}, [])).toEqual(
      false
    );
  });

  test('ignores fields of "_ignore", for eql bug https://github.com/elastic/elasticsearch/issues/77152', () => {
    const fieldsKeys: string[] = ['_ignored', 'foo.host.hostname'];
    expect(filterFieldEntry(['_ignored', dummyValue], fieldsKeys, {}, [])).toEqual(false);
    expect(filterFieldEntry(['foo.host.hostname', dummyValue], fieldsKeys, {}, [])).toEqual(true);
  });

  test('ignores fields given strings and regular expressions in the ignoreFields list', () => {
    const fieldsKeys: string[] = [
      'host.name',
      'user.name', // <-- string from ignoreFields should ignore this
      'host.hostname',
      '_odd.value', // <-- regular expression from ignoreFields should ignore this
    ];
    expect(
      filterFieldEntry(['host.name', dummyValue], fieldsKeys, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(true);
    expect(
      filterFieldEntry(['user.name', dummyValue], fieldsKeys, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(false);
    expect(
      filterFieldEntry(['host.hostname', dummyValue], fieldsKeys, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(true);
    expect(
      filterFieldEntry(['_odd.value', dummyValue], fieldsKeys, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(false);
  });
});
