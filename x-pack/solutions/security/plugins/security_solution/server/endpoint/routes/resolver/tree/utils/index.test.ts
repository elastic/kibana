/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validIDs } from '.';

describe('validIDs', () => {
  it('removes empty strings', () => {
    expect(validIDs(['', 5, 'hello', '', 0])).toEqual([5, 'hello', 0]);
  });
});
