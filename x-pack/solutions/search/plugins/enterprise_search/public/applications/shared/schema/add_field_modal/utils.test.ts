/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatFieldName } from './utils';

describe('formatFieldName', () => {
  it('removes leading and trailing spaces', () => {
    expect(formatFieldName(' helloworld    ')).toEqual('helloworld');
  });

  it('converts all special characters to underscores', () => {
    expect(formatFieldName('hello!#@$123---world')).toEqual('hello_123_world');
  });

  it('strips leading and trailing special characters/underscores', () => {
    expect(formatFieldName('!!helloworld__')).toEqual('helloworld');
  });

  it('lowercases any caps', () => {
    expect(formatFieldName('HELLO_WORLD')).toEqual('hello_world');
  });
});
