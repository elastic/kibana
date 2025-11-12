/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSecurityAgent } from './security_agent';

describe('createSecurityAgent', () => {
  it('returns an agent definition with all correct properties', () => {
    const definition = createSecurityAgent();

    expect(definition.id).toBe('core.security.agent');
    expect(definition.name).toBe('Security Agent');
    expect(definition.labels).toEqual(['security']);
  });
});
