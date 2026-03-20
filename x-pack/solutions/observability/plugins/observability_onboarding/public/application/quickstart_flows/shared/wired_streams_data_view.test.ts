/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WIRED_OTEL_DATA_VIEW_SPEC, WIRED_ECS_DATA_VIEW_SPEC } from './wired_streams_data_view';

describe('WIRED_OTEL_DATA_VIEW_SPEC', () => {
  it('should have the correct title pattern for OTel wired streams', () => {
    expect(WIRED_OTEL_DATA_VIEW_SPEC.title).toBe('logs.otel,logs.otel.*');
  });

  it('should use @timestamp as the time field', () => {
    expect(WIRED_OTEL_DATA_VIEW_SPEC.timeFieldName).toBe('@timestamp');
  });
});

describe('WIRED_ECS_DATA_VIEW_SPEC', () => {
  it('should have the correct title pattern for ECS wired streams', () => {
    expect(WIRED_ECS_DATA_VIEW_SPEC.title).toBe('logs.ecs,logs.ecs.*');
  });

  it('should use @timestamp as the time field', () => {
    expect(WIRED_ECS_DATA_VIEW_SPEC.timeFieldName).toBe('@timestamp');
  });
});
