/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityNodeViewModel } from './types';

describe('EntityNodeViewModel detail fields', () => {
  it('accepts the new optional metadata fields', () => {
    const vm: EntityNodeViewModel = {
      id: 'a',
      color: 'primary',
      shape: 'rectangle',
      entityType: 'user',
      entityIds: ['john.doe'],
      riskScore: { value: 42 },
      assetCriticality: { high: 3 },
      showMetadata: true,
    };
    expect(vm.entityType).toBe('user');
    expect(vm.riskScore?.value).toBe(42);
    expect(vm.assetCriticality?.high).toBe(3);
    expect(vm.showMetadata).toBe(true);
  });
});
