/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySecurityActionMenuItemMetadata } from './apply_action_metadata';

const definitions = {
  example: {
    icon: 'tag',
    sourceKeys: ['example-key', 'example-test-subj'],
  },
} as const;

describe('applySecurityActionMenuItemMetadata', () => {
  it('applies metadata using an item key or data-test-subj', () => {
    expect(
      applySecurityActionMenuItemMetadata(
        [
          { key: 'example-key', name: 'By key' },
          { name: 'By test subject', 'data-test-subj': 'example-test-subj' },
        ],
        definitions
      )
    ).toEqual([
      { key: 'example-key', name: 'By key', icon: 'tag' },
      { name: 'By test subject', 'data-test-subj': 'example-test-subj', icon: 'tag' },
    ]);
  });

  it('preserves unmatched and non-standard items', () => {
    const items = [
      { key: 'custom', name: 'Custom action' },
      { isSeparator: true as const },
      { renderItem: () => null },
    ];

    expect(applySecurityActionMenuItemMetadata(items, definitions)).toEqual(items);
  });
});
