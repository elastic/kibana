/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
} from '@kbn/alerting-plugin/common';
import { normalizeTags } from './normalize_tags';

describe('normalizeTags', () => {
  it('returns an empty array when tags are undefined', () => {
    expect(normalizeTags(undefined)).toEqual([]);
  });

  it('keeps user tags as is', () => {
    expect(normalizeTags(['Domain: Endpoint', 'OS: Windows'])).toEqual([
      'Domain: Endpoint',
      'OS: Windows',
    ]);
  });

  it('removes the missing UIAM API key tag', () => {
    expect(normalizeTags(['Domain: Endpoint', MISSING_UIAM_API_KEY_TAG])).toEqual([
      'Domain: Endpoint',
    ]);
  });

  it('removes the legacy missing UIAM API key tag', () => {
    expect(normalizeTags([LEGACY_MISSING_UIAM_API_KEY_TAG, 'Domain: Endpoint'])).toEqual([
      'Domain: Endpoint',
    ]);
  });
});
