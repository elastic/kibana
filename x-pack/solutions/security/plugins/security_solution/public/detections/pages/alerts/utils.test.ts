/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeFlyoutV2UrlParam } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { resolveFlyoutV2Params } from './utils';

describe('resolveFlyoutV2Params', () => {
  it('preserves existing flyoutV2 query string', () => {
    const existing = '!((kind:document,documentId:a1,indexName:.idx))';
    expect(resolveFlyoutV2Params({ index: '.idx', alertId: 'a1' }, existing)).toBe(existing);
  });

  it('encodes a document descriptor when no current params', () => {
    const expected = encodeFlyoutV2UrlParam([
      { kind: 'document', documentId: 'a1', indexName: '.idx' },
    ]);
    expect(resolveFlyoutV2Params({ index: '.idx', alertId: 'a1' }, null)).toBe(expected);
  });
});
