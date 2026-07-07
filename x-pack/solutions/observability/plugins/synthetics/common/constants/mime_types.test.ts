/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KNOWN_MIME_TYPES,
  MIME_TYPE_FIELD,
  MIME_TYPES_BY_CATEGORY,
  MimeType,
  MimeTypesMap,
  mimeCategoryQuery,
  selectedMimeCategoriesQuery,
} from './mime_types';

describe('mime type taxonomy', () => {
  describe('MIME_TYPES_BY_CATEGORY', () => {
    it('inverts MimeTypesMap so each category lists its mime types', () => {
      expect(MIME_TYPES_BY_CATEGORY[MimeType.Stylesheet]).toEqual(['text/css']);
      expect(MIME_TYPES_BY_CATEGORY[MimeType.Script]).toEqual([
        'application/javascript',
        'application/x-javascript',
        'text/javascript',
      ]);
      expect(MIME_TYPES_BY_CATEGORY[MimeType.Image]).toContain('image/png');
    });

    it('has no explicit mimes for the Other fallback category', () => {
      expect(MIME_TYPES_BY_CATEGORY[MimeType.Other]).toBeUndefined();
    });

    it('covers every mime in MimeTypesMap exactly once', () => {
      const flattened = Object.values(MIME_TYPES_BY_CATEGORY).flat();
      expect(flattened.sort()).toEqual(Object.keys(MimeTypesMap).sort());
      expect(KNOWN_MIME_TYPES).toEqual(Object.keys(MimeTypesMap));
    });
  });

  describe('mimeCategoryQuery', () => {
    it('matches a category by its mime types', () => {
      expect(mimeCategoryQuery(MimeType.Stylesheet)).toEqual({
        terms: { [MIME_TYPE_FIELD]: ['text/css'] },
      });
    });

    it('matches "Other" as anything with a mime type that is not categorized', () => {
      expect(mimeCategoryQuery(MimeType.Other)).toEqual({
        bool: {
          filter: [{ exists: { field: MIME_TYPE_FIELD } }],
          must_not: [{ terms: { [MIME_TYPE_FIELD]: KNOWN_MIME_TYPES } }],
        },
      });
    });
  });

  describe('selectedMimeCategoriesQuery', () => {
    it('ORs the selected categories together', () => {
      expect(selectedMimeCategoriesQuery([MimeType.Stylesheet, MimeType.Image])).toEqual({
        bool: {
          minimum_should_match: 1,
          should: [mimeCategoryQuery(MimeType.Stylesheet), mimeCategoryQuery(MimeType.Image)],
        },
      });
    });

    it('includes the Other exclusion clause when selected', () => {
      expect(selectedMimeCategoriesQuery([MimeType.Other])).toEqual({
        bool: {
          minimum_should_match: 1,
          should: [mimeCategoryQuery(MimeType.Other)],
        },
      });
    });
  });
});
