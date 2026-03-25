/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertHighlightedFieldsToPrevalenceFilters } from './highlighted_fields_helpers';

describe('convertHighlightedFieldsToPrevalenceFilters', () => {
  it('should convert highlighted fields to prevalence filters', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
      'user.name': {
        values: ['user-1', 'user-2'],
      },
    };
    expect(convertHighlightedFieldsToPrevalenceFilters(highlightedFields)).toEqual({
      'host.name': { terms: { 'host.name': ['host-1'] } },
      'user.name': { terms: { 'user.name': ['user-1', 'user-2'] } },
    });
  });
});
