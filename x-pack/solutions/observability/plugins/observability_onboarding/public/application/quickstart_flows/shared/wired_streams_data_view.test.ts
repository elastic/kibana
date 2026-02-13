/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WIRED_LOGS_DATA_VIEW_SPEC } from './wired_streams_data_view';

describe('WIRED_LOGS_DATA_VIEW_SPEC', () => {
  it('should have the correct title pattern for wired streams logs', () => {
    expect(WIRED_LOGS_DATA_VIEW_SPEC.title).toBe('logs,logs.*');
  });

  it('should use @timestamp as the time field', () => {
    expect(WIRED_LOGS_DATA_VIEW_SPEC.timeFieldName).toBe('@timestamp');
  });

  it('should match logs and logs.* indices for wired streams routing', () => {
    const pattern = WIRED_LOGS_DATA_VIEW_SPEC.title;
    expect(pattern).toContain('logs');
    expect(pattern).toContain('logs.*');
  });
});
