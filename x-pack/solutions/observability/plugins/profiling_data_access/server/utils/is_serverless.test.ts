/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isServerless } from './is_serverless';

describe('isServerless', () => {
  it('returns true for serverless builds', () => {
    expect(isServerless('serverless')).toBe(true);
  });

  it('returns false for traditional builds', () => {
    expect(isServerless('traditional')).toBe(false);
  });
});
