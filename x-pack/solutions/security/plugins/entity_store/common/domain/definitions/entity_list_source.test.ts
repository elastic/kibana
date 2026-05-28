/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_ATTRIBUTES_SUMMARY_SOURCE_PATH,
  buildEntityListSourceFilter,
} from './entity_list_source';

describe('entity_list_source', () => {
  describe('buildEntityListSourceFilter', () => {
    it('excludes AI summary by default', () => {
      expect(buildEntityListSourceFilter({})).toEqual({
        _source_excludes: [ENTITY_ATTRIBUTES_SUMMARY_SOURCE_PATH],
      });
    });

    it('returns full source when includeSummary is true', () => {
      expect(buildEntityListSourceFilter({ includeSummary: true })).toEqual({});
    });

    it('applies excludes alongside explicit source includes', () => {
      expect(
        buildEntityListSourceFilter({
          sourceIncludes: ['entity.id', 'entity.risk'],
        })
      ).toEqual({
        _source: ['entity.id', 'entity.risk'],
        _source_excludes: [ENTITY_ATTRIBUTES_SUMMARY_SOURCE_PATH],
      });
    });
  });
});
