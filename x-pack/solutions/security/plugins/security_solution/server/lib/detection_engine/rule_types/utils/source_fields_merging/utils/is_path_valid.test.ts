/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { robustIsPathValid } from './is_path_valid';

describe('robustIsPathValid', () => {
  test('valid when empty string is key', () => {
    expect(robustIsPathValid('', {})).toEqual(true);
  });

  test('valid when a path and empty object', () => {
    expect(robustIsPathValid('a.b.c', {})).toEqual(true);
  });

  test('not valid when a path and an array exists', () => {
    expect(robustIsPathValid('a', { a: [] })).toEqual(false);
  });

  test('not valid when a path and primitive value exists', () => {
    expect(robustIsPathValid('a', { a: 'test' })).toEqual(false);
    expect(robustIsPathValid('a', { a: 1 })).toEqual(false);
    expect(robustIsPathValid('a', { a: true })).toEqual(false);
  });

  test('valid when a path and object value exists', () => {
    expect(robustIsPathValid('a', { a: {} })).toEqual(true);
  });

  test('not valid when a path and an array exists within the parent path at level 1', () => {
    expect(robustIsPathValid('a.b', { a: [] })).toEqual(false);
  });

  test('not valid when a path and primitive value exists within the parent path at level 1', () => {
    expect(robustIsPathValid('a.b', { a: 'test' })).toEqual(false);
    expect(robustIsPathValid('a.b', { a: 1 })).toEqual(false);
    expect(robustIsPathValid('a.b', { a: true })).toEqual(false);
  });

  test('valid when a path and object value exists within the parent path at level 1', () => {
    expect(robustIsPathValid('a.b', { a: {} })).toEqual(true);
  });

  test('not valid when a path and an array exists within the parent path at level 2', () => {
    expect(robustIsPathValid('a.b.c', { a: { b: [] } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { 'a.b': [] })).toEqual(false);
  });

  test('not valid when a path and primitive value exists within the parent path at level 2', () => {
    expect(robustIsPathValid('a.b.c', { a: { b: 'test' } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { a: { b: 1 } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { a: { b: true } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { 'a.b': true })).toEqual(false);
  });

  test('valid when a path and object value exists within the parent path at the last level 2', () => {
    expect(robustIsPathValid('a.b', { a: { b: {} } })).toEqual(true);
  });

  test('not valid when a path and an array exists within the parent path at the last level 3', () => {
    expect(robustIsPathValid('a.b.c', { a: { b: { c: [] } } })).toEqual(false);
  });

  test('not valid when a path and primitive value exists within the parent path at the last level 3', () => {
    expect(robustIsPathValid('a.b.c', { a: { b: { c: 'test' } } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { a: { b: { c: 1 } } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { a: { b: { c: true } } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { 'a.b.c': true })).toEqual(false);
  });

  test('valid when a path and object value exists within the parent path at the last level 3', () => {
    expect(robustIsPathValid('a.b.c', { a: { b: { c: {} } } })).toEqual(true);
    expect(robustIsPathValid('a.b.c', { 'a.b.c': {} })).toEqual(true);
  });

  test('valid when using dot notation', () => {
    expect(robustIsPathValid('a.b.c', { a: { 'b.c': {} } })).toEqual(true);
    expect(robustIsPathValid('a.b.c', { 'a.b': { c: {} } })).toEqual(true);
    expect(robustIsPathValid('a.b.c.d', { a: { 'b.c': { d: {} } } })).toEqual(true);
  });

  test('not valid when using dot notation and array is present in source on the last level', () => {
    expect(robustIsPathValid('a.b.c', { a: { 'b.c': [] } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { 'a.b': { c: [] } })).toEqual(false);
    expect(robustIsPathValid('a.b.c.d', { a: { 'b.c': { d: [] } } })).toEqual(false);
  });

  test('not valid when any key has dot notation and primitive value is present in source on the last level', () => {
    expect(robustIsPathValid('a.b.c', { a: { 'b.c': 1 } })).toEqual(false);
    expect(robustIsPathValid('a.b.c', { 'a.b': { c: 1 } })).toEqual(false);
    expect(robustIsPathValid('a.b.c.d', { a: { 'b.c': { d: 1 } } })).toEqual(false);
  });

  test('not valid when any key has dot notation and array is present in source on level 2', () => {
    expect(robustIsPathValid('a.b.c.d', { a: { 'b.c': [] } })).toEqual(false);
    expect(robustIsPathValid('a.b.c.d', { 'a.b': { c: [] } })).toEqual(false);
  });
});
