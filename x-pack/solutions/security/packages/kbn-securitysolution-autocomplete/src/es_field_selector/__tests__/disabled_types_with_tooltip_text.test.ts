/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { disabledTypesWithTooltipText } from '../disabled_types_with_tooltip_text';

vi.mock('../../translations', () => {
  const mocked = {
    BINARY_TYPE_NOT_SUPPORTED: 'Binary fields are currently unsupported',
  };
  return { ...mocked, default: mocked };
});
describe('disabledTypesWithTooltipText', () => {
  it('should return Binary fields are currently unsupported for binary type', () => {
    const type = 'binary';
    expect(disabledTypesWithTooltipText[type]).toEqual('Binary fields are currently unsupported');
  });
});
