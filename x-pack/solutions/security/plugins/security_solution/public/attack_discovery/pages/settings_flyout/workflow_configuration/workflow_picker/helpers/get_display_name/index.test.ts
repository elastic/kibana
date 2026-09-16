/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDisplayName } from '.';

describe('getDisplayName', () => {
  it('returns just the name when enabled is true', () => {
    expect(getDisplayName({ enabled: true, name: 'My Workflow' })).toBe('My Workflow');
  });

  it('returns just the name when enabled is undefined', () => {
    expect(getDisplayName({ name: 'My Workflow' })).toBe('My Workflow');
  });

  it('appends the disabled suffix when enabled is false', () => {
    expect(getDisplayName({ enabled: false, name: 'My Workflow' })).toBe('My Workflow (disabled)');
  });

  it('returns just the name for an empty string name', () => {
    expect(getDisplayName({ name: '' })).toBe('');
  });

  it('appends the disabled suffix for an empty string name when enabled is false', () => {
    expect(getDisplayName({ enabled: false, name: '' })).toBe(' (disabled)');
  });
});
