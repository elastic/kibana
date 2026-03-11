/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScriptsLibraryUrlParams } from './scripts_library_url_params';
import { scriptsLibraryFiltersFromUrlParams } from './scripts_library_url_params';

describe('#scriptsLibraryFiltersFromUrlParams', () => {
  it('should return no params when no URL params are provided', () => {
    expect(scriptsLibraryFiltersFromUrlParams({})).toEqual({});
  });

  it('should parse and return only valid URL params', () => {
    expect(
      scriptsLibraryFiltersFromUrlParams({
        kuery: 'name: test',
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
      })
    ).toEqual({
      kuery: 'name: test',
      page: 2,
      pageSize: 20,
      sortField: 'updatedBy',
      sortDirection: 'desc',
    });
  });

  it('should ignore invalid paging params', () => {
    expect(
      scriptsLibraryFiltersFromUrlParams({
        page: -1,
        pageSize: 0,
        sortField: 'createdBy',
        sortDirection: 'asc',
        kuery: 'name: test',
      })
    ).toEqual({
      kuery: 'name: test',
      sortField: 'createdBy',
      sortDirection: 'asc',
    });
  });

  it('should ignore invalid sorting URL params', () => {
    expect(
      scriptsLibraryFiltersFromUrlParams({
        kuery: 'name: test',
        page: 12,
        pageSize: 50,
        sortField: 'invalid_field' as ScriptsLibraryUrlParams['sortField'],
        sortDirection: 'invalid_direction' as ScriptsLibraryUrlParams['sortDirection'],
      })
    ).toEqual({
      kuery: 'name: test',
      page: 12,
      pageSize: 50,
    });
  });

  it('should handle partial URL params', () => {
    expect(
      scriptsLibraryFiltersFromUrlParams({
        kuery: 'name: test',
        page: 1,
      })
    ).toEqual({
      kuery: 'name: test',
      page: 1,
    });
  });
});
