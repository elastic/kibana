/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nullifyMissingProperties } from './nullify_missing_properties';

interface TestObject {
  title?: string;
  name?: string;
  boolean?: boolean;
  missing?: string | undefined;
  emptyText?: string;
  counter?: number;
  nullableValue: string | null;
}

describe('nullifyMissingProperties', () => {
  it('should return an object with nullified empty values', () => {
    const source: TestObject = {
      title: 'Some Title',
      boolean: true,
      emptyText: 'defined',
      counter: 1,
      missing: 'defined',
      nullableValue: 'some value',
    };
    const target: TestObject = {
      name: 'Some Name',
      boolean: false,
      emptyText: '',
      counter: 0,
      missing: undefined,
      nullableValue: null,
    };

    const result = nullifyMissingProperties<TestObject>({
      source,
      target,
    });

    expect(result).toMatchObject({
      title: null,
      name: 'Some Name',
      boolean: false,
      emptyText: '',
      counter: 0,
      missing: null,
      nullableValue: null,
    });
  });
});
