/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('digital_experience config', () => {
  it('is disabled by default', () => {
    expect(config.schema.validate({})).toEqual({ enabled: false });
  });

  it('can be enabled', () => {
    expect(config.schema.validate({ enabled: true })).toEqual({ enabled: true });
  });
});
