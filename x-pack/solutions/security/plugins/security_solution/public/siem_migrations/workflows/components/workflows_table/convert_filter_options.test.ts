/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusFilterBase } from '../../../common/types';
import { convertFilterOptions } from './convert_filter_options';

describe('convertFilterOptions (workflows)', () => {
  it('should not filter when no status is selected', () => {
    expect(convertFilterOptions(undefined)).toEqual({});
  });

  it.each([
    [StatusFilterBase.TRANSLATED, { fullyTranslated: true, failed: false }],
    [StatusFilterBase.PARTIALLY_TRANSLATED, { partiallyTranslated: true, failed: false }],
    [StatusFilterBase.UNTRANSLATABLE, { untranslatable: true, failed: false }],
    [StatusFilterBase.FAILED, { failed: true }],
  ])('should convert the %s status into the matching list filters', (status, expected) => {
    expect(convertFilterOptions({ status })).toEqual(expected);
  });
});
