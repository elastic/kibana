/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendSearch } from './helpers';

describe('appendSearch', () => {
  test('should return empty string if no parameter', () => {
    expect(appendSearch()).toEqual('');
  });
  test('should return empty string if parameter is undefined', () => {
    expect(appendSearch(undefined)).toEqual('');
  });
  test('should return parameter if  parameter is defined', () => {
    expect(appendSearch('helloWorld')).toEqual('?helloWorld');
  });
});
