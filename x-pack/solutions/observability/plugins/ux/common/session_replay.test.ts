/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sessionUserFromKey } from './session_replay';

describe('sessionUserFromKey', () => {
  it('treats an email key as email so the table can show it', () => {
    expect(sessionUserFromKey('dave.denscombe@elastic.co')).toEqual({
      id: 'dave.denscombe@elastic.co',
      email: 'dave.denscombe@elastic.co',
      name: null,
    });
  });

  it('treats a non-email key as id and name', () => {
    expect(sessionUserFromKey('ada')).toEqual({
      id: 'ada',
      email: null,
      name: 'ada',
    });
  });

  it('returns an empty user when the session rollup has no key', () => {
    expect(sessionUserFromKey(null)).toEqual({ id: null, email: null, name: null });
  });
});
