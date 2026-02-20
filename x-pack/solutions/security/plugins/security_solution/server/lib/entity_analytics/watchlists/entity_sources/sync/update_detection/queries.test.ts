/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildUsersSearchBody } from './queries';

describe('Watchlist sync queries', () => {
  describe('buildUsersSearchBody', () => {
    it('constructs the correct search body with default page size', () => {
      const searchBody = buildUsersSearchBody();
      expect(searchBody).toMatchSnapshot();
    });

    it('constructs the correct search body with an afterKey for pagination', () => {
      const afterKey = { username: 'jdoe' };
      const searchBody = buildUsersSearchBody(afterKey);
      expect(searchBody).toMatchSnapshot();
    });

    it('constructs the correct search body with a custom page size', () => {
      const searchBody = buildUsersSearchBody(undefined, 50);
      expect(searchBody).toMatchSnapshot();
    });

    it('constructs the correct search body with afterKey and custom page size', () => {
      const afterKey = { username: 'user42' };
      const searchBody = buildUsersSearchBody(afterKey, 25);
      expect(searchBody).toMatchSnapshot();
    });
  });
});
