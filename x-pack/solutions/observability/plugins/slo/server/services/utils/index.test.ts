/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedGroupings } from '.';

describe('utils', () => {
  describe('getFlattenedGroupings', () => {
    it.each(['a.nested.key', ['a.nested.key']])(
      'handles single group by with nested keys',
      (groupBy) => {
        const groupings = {
          a: {
            nested: {
              key: 'value',
            },
          },
        };
        expect(getFlattenedGroupings({ groupBy, groupings })).toEqual({ 'a.nested.key': 'value' });
      }
    );

    it.each(['not_nested', ['not_nested']])(
      'handles single group by with regular keys',
      (groupBy) => {
        const groupings = {
          not_nested: 'value',
        };
        expect(getFlattenedGroupings({ groupBy, groupings })).toEqual({ not_nested: 'value' });
      }
    );

    it('handles multi group by with nested and regular keys', () => {
      const groupBy = ['a.nested.key', 'not_nested'];
      const groupings = {
        not_nested: 'value2',
        a: {
          nested: {
            key: 'value',
          },
        },
      };
      expect(getFlattenedGroupings({ groupBy, groupings })).toEqual({
        'a.nested.key': 'value',
        not_nested: 'value2',
      });
    });
  });
});
