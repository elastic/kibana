/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeFlyoutV2UrlParam } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { resolveAttackFlyoutV2Params } from './utils';

describe('resolveAttackFlyoutV2Params', () => {
  it('preserves existing flyoutV2 query string', () => {
    const existing = '!((kind:attack,attackId:a1,indexName:.idx))';
    expect(resolveAttackFlyoutV2Params({ index: '.idx', attackId: 'a1' }, existing)).toBe(existing);
  });

  it('encodes an attack descriptor when no current params', () => {
    const expected = encodeFlyoutV2UrlParam([
      { kind: 'attack', attackId: 'a1', indexName: '.idx' },
    ]);
    expect(resolveAttackFlyoutV2Params({ index: '.idx', attackId: 'a1' }, null)).toBe(expected);
  });
});
