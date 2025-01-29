/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPolicyQuery, parseQueryFilterToKQL } from './utils';

describe('utils', () => {
  const searchableFields = [`name`, `description`, `entries.value`, `entries.entries.value`];
  describe('parseQueryFilterToKQL', () => {
    it('should parse simple query without term', () => {
      expect(parseQueryFilterToKQL('', searchableFields)).toBe('');
    });
    it('should parse simple query with term', () => {
      expect(parseQueryFilterToKQL('simpleQuery', searchableFields)).toBe(
        '(exception-list-agnostic.attributes.name:(*simpleQuery*) OR exception-list-agnostic.attributes.description:(*simpleQuery*) OR exception-list-agnostic.attributes.entries.value:(*simpleQuery*) OR exception-list-agnostic.attributes.entries.entries.value:(*simpleQuery*))'
      );
    });
    it('should parse complex query with term', () => {
      expect(parseQueryFilterToKQL('complex query', searchableFields)).toBe(
        '(exception-list-agnostic.attributes.name:(*complex*query*) OR exception-list-agnostic.attributes.description:(*complex*query*) OR exception-list-agnostic.attributes.entries.value:(*complex*query*) OR exception-list-agnostic.attributes.entries.entries.value:(*complex*query*))'
      );
    });
    it('should parse complex query with colon and backslash chars term', () => {
      expect(parseQueryFilterToKQL('C:\\tmpes', searchableFields)).toBe(
        '(exception-list-agnostic.attributes.name:(*C\\:\\\\tmpes*) OR exception-list-agnostic.attributes.description:(*C\\:\\\\tmpes*) OR exception-list-agnostic.attributes.entries.value:(*C\\:\\\\tmpes*) OR exception-list-agnostic.attributes.entries.entries.value:(*C\\:\\\\tmpes*))'
      );
    });
    it('should parse complex query with special chars term', () => {
      expect(
        parseQueryFilterToKQL(
          "this'is%&query{}[]!¿?with.,-+`´special<>ºª@#|·chars",
          searchableFields
        )
      ).toBe(
        "(exception-list-agnostic.attributes.name:(*this'is%&query\\{\\}[]!¿?with.,-+`´special\\<\\>ºª@#|·chars*) OR exception-list-agnostic.attributes.description:(*this'is%&query\\{\\}[]!¿?with.,-+`´special\\<\\>ºª@#|·chars*) OR exception-list-agnostic.attributes.entries.value:(*this'is%&query\\{\\}[]!¿?with.,-+`´special\\<\\>ºª@#|·chars*) OR exception-list-agnostic.attributes.entries.entries.value:(*this'is%&query\\{\\}[]!¿?with.,-+`´special\\<\\>ºª@#|·chars*))"
      );
    });
  });

  describe('getPolicyQuery', () => {
    it('should translate policy ID to kuery', () => {
      expect(getPolicyQuery('aaa')).toBe('exception-list-agnostic.attributes.tags:"policy:aaa"');
    });

    it('should translate global policy ID to kuery using `policy:all`', () => {
      expect(getPolicyQuery('global')).toBe('exception-list-agnostic.attributes.tags:"policy:all"');
    });

    it('should translate unassigned policy ID to kuery using `policy:all`', () => {
      expect(getPolicyQuery('unassigned')).toBe(
        '(not exception-list-agnostic.attributes.tags:policy\\:*)'
      );
    });
  });
});
