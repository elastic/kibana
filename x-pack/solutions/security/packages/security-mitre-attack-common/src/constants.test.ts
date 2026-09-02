/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MITRE_FRAMEWORK, DEFAULT_MITRE_ENTITY_STATUS } from './constants';

describe('MITRE defaults', () => {
  it('defaults the framework to enterprise', () => {
    expect(DEFAULT_MITRE_FRAMEWORK).toBe('enterprise');
  });

  it('defaults the entity status to active so revoked and deprecated entities are excluded', () => {
    expect(DEFAULT_MITRE_ENTITY_STATUS).toBe('active');
  });
});
