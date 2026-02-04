/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Matcher } from '../../../../../../../common/api/entity_analytics';
import { buildPrivilegedSearchBody } from './queries';

describe('Integration sync queries', () => {
  describe('buildPrivilegedSearchBody', () => {
    it('constructs the correct search body for a single matcher', () => {
      const matchers = [
        {
          fields: ['user.role', 'user.roles'],
          values: ['Admin', 'Superuser'],
        },
      ];
      const timeGte = '2023-01-01T00:00:00Z';
      const afterKey = undefined;
      const pageSize = 25;

      const searchBody = buildPrivilegedSearchBody(matchers, timeGte, afterKey, pageSize);
      expect(searchBody).toMatchSnapshot();
    });

    it('constructs the correct search body for multiple matchers', () => {
      const matchers = [
        {
          fields: ['user.role', 'user.roles'],
          values: ['Admin', 'Superuser'],
        },
        {
          fields: ['user.department'],
          values: ['HR', 'Finance'],
        },
      ];
      const timeGte = '2023-01-01T00:00:00Z';
      const afterKey = { username: 'jdoe' };
      const pageSize = 50;

      const searchBody = buildPrivilegedSearchBody(matchers, timeGte, afterKey, pageSize);

      expect(searchBody).toMatchSnapshot();
    });

    it('constructs the correct search body for empty matchers', () => {
      const matchers: Matcher[] = [];
      const timeGte = '2023-01-01T00:00:00Z';
      const afterKey = undefined;
      const pageSize = 25;

      const searchBody = buildPrivilegedSearchBody(matchers, timeGte, afterKey, pageSize);

      expect(searchBody).toMatchSnapshot();
    });
  });
});
