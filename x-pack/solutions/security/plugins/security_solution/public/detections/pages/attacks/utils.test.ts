/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { AttackDetailsRightPanelKey } from '../../../flyout/attack_details/constants/panel_keys';
import { resolveAttackFlyoutParams } from './utils';

describe('resolveAttackFlyoutParams', () => {
  it('preserves existing flyout query string', () => {
    const existing = '(preview:!(),right:(id:other))';
    expect(resolveAttackFlyoutParams({ index: '.idx', attackId: 'a1' }, existing)).toBe(existing);
  });

  it('encodes attack details flyout when no current params', () => {
    const expected = encode({
      right: {
        id: AttackDetailsRightPanelKey,
        params: { attackId: 'a1', indexName: '.idx' },
      },
      left: undefined,
      preview: [],
    });
    expect(resolveAttackFlyoutParams({ index: '.idx', attackId: 'a1' }, null)).toBe(expected);
  });
});
