/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScriptLibraryUrlParams } from './script_library_url_params';
import { scriptLibraryFiltersFromUrlParams } from './script_library_url_params';

describe('#scriptLibraryFiltersFromUrlParams', () => {
  it('should return no params when no URL params are provided', () => {
    expect(scriptLibraryFiltersFromUrlParams({})).toEqual({
      fileType: [],
      category: [],
      os: [],
      searchTerms: [],
    });
  });

  it('should parse and return only valid URL params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        os: ['windows', 'linux'],
        fileType: ['archive', 'script'],
        category: ['discovery', 'userManagement'],
        searchTerms: ['test'],
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
      })
    ).toEqual({
      os: ['linux', 'windows'],
      fileType: ['archive', 'script'],
      category: ['discovery', 'userManagement'],
      searchTerms: ['test'],
      page: 2,
      pageSize: 20,
      sortField: 'updatedBy',
      sortDirection: 'desc',
    });
  });

  it('should ignore invalid fileType params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        // @ts-expect-error - testing invalid fileType value
        fileType: ['invalid', 'script'],
      })
    ).toEqual({
      fileType: ['script'],
      category: [],
      os: [],
      searchTerms: [],
    });
  });

  it('should ignore invalid os params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        // @ts-expect-error - testing invalid os value
        os: ['invalid', 'windows'],
      })
    ).toEqual({
      fileType: [],
      category: [],
      os: ['windows'],
      searchTerms: [],
    });
  });

  it('should ignore invalid category params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        // @ts-expect-error - testing invalid category value
        category: ['invalid', 'discovery'],
      })
    ).toEqual({
      fileType: [],
      category: ['discovery'],
      os: [],
      searchTerms: [],
    });
  });

  it('should ignore invalid paging params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        page: -1,
        pageSize: 0,
        sortField: 'createdBy',
        sortDirection: 'asc',
        searchTerms: ['test'],
      })
    ).toEqual({
      category: [],
      fileType: [],
      os: [],
      searchTerms: ['test'],
      sortField: 'createdBy',
      sortDirection: 'asc',
    });
  });

  it('should ignore invalid sorting URL params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        searchTerms: ['test'],
        page: 12,
        pageSize: 50,
        sortField: 'invalid_field' as ScriptLibraryUrlParams['sortField'],
        sortDirection: 'invalid_direction' as ScriptLibraryUrlParams['sortDirection'],
      })
    ).toEqual({
      category: [],
      fileType: [],
      os: [],
      searchTerms: ['test'],
      page: 12,
      pageSize: 50,
    });
  });

  it('should handle partial URL params', () => {
    expect(
      scriptLibraryFiltersFromUrlParams({
        searchTerms: ['test'],
        page: 1,
      })
    ).toEqual({
      category: [],
      fileType: [],
      os: [],
      searchTerms: ['test'],
      page: 1,
    });
  });
});
