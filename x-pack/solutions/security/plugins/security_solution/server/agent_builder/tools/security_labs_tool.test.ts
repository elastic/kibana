/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityLabsTool } from './security_labs_tool';

describe('securityLabsTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a tool definition with correct properties', () => {
    const tool = securityLabsTool();

    expect(tool.id).toBe('core.security.security_labs');
    expect(tool.schema).toBeDefined();
  });
});
