/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/engine_logic.mock';

import { getCurationsBreadcrumbs, convertToDate, addDocument, removeDocument } from './utils';

describe('getCurationsBreadcrumbs', () => {
  it('generates curation-prefixed breadcrumbs', () => {
    expect(getCurationsBreadcrumbs()).toEqual(['Engines', 'some-engine', 'Curations']);
    expect(getCurationsBreadcrumbs(['Some page'])).toEqual([
      'Engines',
      'some-engine',
      'Curations',
      'Some page',
    ]);
  });
});

describe('convertToDate', () => {
  it('converts the English-only server timestamps to a parseable Date', () => {
    const serverDateString = 'January 01, 1970 at 12:00PM';
    const date = convertToDate(serverDateString);

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toEqual(1970);
  });
});

describe('addDocument', () => {
  it('adds a new document to the end of the document array without mutating the original array', () => {
    const originalDocuments = ['hello'];
    const newDocuments = addDocument(originalDocuments, 'world');

    expect(newDocuments).toEqual(['hello', 'world']);
    expect(newDocuments).not.toBe(originalDocuments); // Would fail if we had mutated the array
  });
});

describe('removeDocument', () => {
  it('removes a specific document from the array without mutating the original array', () => {
    const originalDocuments = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
    const newDocuments = removeDocument(originalDocuments, 'dolor');

    expect(newDocuments).toEqual(['lorem', 'ipsum', 'sit', 'amet']);
    expect(newDocuments).not.toBe(originalDocuments); // Would fail if we had mutated the array
  });
});
