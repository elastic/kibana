/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertFilterOptions } from './filters';
import { StatusFilterBase } from '../../../../common/types';
import { AuthorFilter, RulesSpecificStatusFilter } from '../../../types';

describe('convertFilterOptions', () => {
  it('filters by `installed` status', () => {
    const filters = convertFilterOptions({ status: StatusFilterBase.INSTALLED });
    expect(filters).toEqual({ installed: true });
  });

  it('filters by `translated` status', () => {
    const filters = convertFilterOptions({ status: StatusFilterBase.TRANSLATED });
    expect(filters).toEqual({ installed: false, fullyTranslated: true, failed: false });
  });

  it('filters by `partially translated` status', () => {
    const filters = convertFilterOptions({ status: StatusFilterBase.PARTIALLY_TRANSLATED });
    expect(filters).toEqual({ partiallyTranslated: true, failed: false });
  });

  it('filters by `untranslatable` status', () => {
    const filters = convertFilterOptions({ status: StatusFilterBase.UNTRANSLATABLE });
    expect(filters).toEqual({ untranslatable: true, failed: false });
  });

  it('filters by `failed` status', () => {
    const filters = convertFilterOptions({ status: StatusFilterBase.FAILED });
    expect(filters).toEqual({ failed: true });
  });

  it('filters by `index pattern missing` status', () => {
    const filters = convertFilterOptions({
      status: RulesSpecificStatusFilter.INDEX_PATTERN_MISSING,
    });
    expect(filters).toEqual({ missingIndex: true });
  });

  it('filters by `elastic` author', () => {
    const filters = convertFilterOptions({ author: AuthorFilter.ELASTIC });
    expect(filters).toEqual({ prebuilt: true });
  });

  it('filters by `custom` author', () => {
    const filters = convertFilterOptions({ author: AuthorFilter.CUSTOM });
    expect(filters).toEqual({ prebuilt: false });
  });

  it('filters by `elastic` author and `installed` status', () => {
    const filters = convertFilterOptions({
      author: AuthorFilter.ELASTIC,
      status: StatusFilterBase.INSTALLED,
    });
    expect(filters).toEqual({ prebuilt: true, installed: true });
  });

  it('returns empty filters if no status is provided', () => {
    const filters = convertFilterOptions({});
    expect(filters).toEqual({});
  });

  it('returns empty filters if filterOptions is undefined', () => {
    const filters = convertFilterOptions(undefined);
    expect(filters).toEqual({});
  });
});
