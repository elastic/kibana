/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParamsObjectSchema } from './add_param';

describe('ParamsObjectSchema', () => {
  const base = { key: 'apiKey', value: 'secret' };

  it('rejects unknown keys so a sharing typo cannot create a space-local param', () => {
    expect(ParamsObjectSchema.safeParse({ ...base, share_across_space: true }).success).toBe(false);
  });

  it('accepts share_across_spaces', () => {
    expect(ParamsObjectSchema.parse({ ...base, share_across_spaces: true })).toEqual({
      ...base,
      share_across_spaces: true,
    });
  });
});
