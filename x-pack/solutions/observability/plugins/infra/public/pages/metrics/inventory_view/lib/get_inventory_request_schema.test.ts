/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { getInventoryRequestSchema } from './get_inventory_request_schema';

describe('getInventoryRequestSchema', () => {
  it('follows preferredSchema when set', () => {
    expect(getInventoryRequestSchema('semconv')).toBe('semconv');
    expect(getInventoryRequestSchema('ecs')).toBe('ecs');
  });

  it('falls through to DEFAULT_SCHEMA when preferredSchema is unset', () => {
    expect(getInventoryRequestSchema(null)).toBe(DEFAULT_SCHEMA);
    expect(getInventoryRequestSchema(undefined)).toBe(DEFAULT_SCHEMA);
  });
});
