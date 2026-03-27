/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetEndpointScriptsList } from './use_get_scripts_list';
import { useQuery as _useQuery } from '@kbn/react-query';
import { scriptsLibraryHttpMocks } from '../../mocks/scripts_library_http_mocks';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
  type ReactQueryHookRenderer,
} from '../../../common/mock/endpoint';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointScriptsList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointScriptsList>,
    ReturnType<typeof useGetEndpointScriptsList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof scriptsLibraryHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = scriptsLibraryHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() => useGetEndpointScriptsList({}));

    expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith({
      path: SCRIPTS_LIBRARY_ROUTE,
      version: '2023-10-31',
      query: {
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('should use correct query values', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointScriptsList({
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
      })
    );
    expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith({
      path: SCRIPTS_LIBRARY_ROUTE,
      version: '2023-10-31',
      query: {
        page: 2,
        pageSize: 20,
        sortField: 'updatedBy',
        sortDirection: 'desc',
      },
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointScriptsList(
          {},
          {
            queryKey: ['11', '21'],
            enabled: false,
          }
        ),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['11', '21'],
        enabled: false,
      })
    );
  });

  describe('KQL query construction', () => {
    it('should construct escaped KQL for search terms with special characters', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          searchTerms: [
            `\\test \\search\\`,
            `"another" "search" "term", \\backspace`,
            `*"quoted-hyphen-wildcard"*`,
          ],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              '((name:*\\\\test*\\\\search\\\\* OR updatedBy:*\\\\test*\\\\search\\\\* OR fileHash:*\\\\test*\\\\search\\\\*) OR (name:*\\"another\\"*\\"search\\"*\\"term\\",*\\\\backspace* OR updatedBy:*\\"another\\"*\\"search\\"*\\"term\\",*\\\\backspace* OR fileHash:*\\"another\\"*\\"search\\"*\\"term\\",*\\\\backspace*) OR (name:*\\*\\"quoted-hyphen-wildcard\\"\\** OR updatedBy:*\\*\\"quoted-hyphen-wildcard\\"\\** OR fileHash:*\\*\\"quoted-hyphen-wildcard\\"\\**))',
          }),
        })
      );
    });

    it('should construct the correct KQL for matching search filter (without quotes)', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          searchTerms: ['test search'],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery: '(name:*test*search* OR updatedBy:*test*search* OR fileHash:*test*search*)',
          }),
        })
      );
    });

    it('should construct the correct KQL for matching search filter for multiple search terms (without quotes)', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          searchTerms: ['test search', 'another search term'],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              '((name:*test*search* OR updatedBy:*test*search* OR fileHash:*test*search*) OR (name:*another*search*term* OR updatedBy:*another*search*term* OR fileHash:*another*search*term*))',
          }),
        })
      );
    });

    it('should construct the correct KQL query when single element array', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          os: ['windows'],
          fileType: ['script'],
          category: ['dataCollection'],
          searchTerms: ['test search'],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              'platform:"windows" AND fileType:"script" AND tags:"dataCollection" AND (name:*test*search* OR updatedBy:*test*search* OR fileHash:*test*search*)',
          }),
        })
      );
    });

    it('should construct the correct KQL query when multiple element array', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          os: ['linux', 'windows'],
          fileType: ['script', 'archive'],
          category: ['dataCollection', 'userManagement'],
          searchTerms: ['test search', 'another search term'],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              '(platform:"linux" OR platform:"windows") AND (fileType:"script" OR fileType:"archive") AND (tags:"dataCollection" OR tags:"userManagement") AND ((name:*test*search* OR updatedBy:*test*search* OR fileHash:*test*search*) OR (name:*another*search*term* OR updatedBy:*another*search*term* OR fileHash:*another*search*term*))',
          }),
        })
      );
    });

    it('should construct correct KQL when special characters are present', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          os: ['linux', 'windows'],
          fileType: ['script', 'archive'],
          category: ['dataCollection', 'userManagement'],
          searchTerms: [`\\test \\search\\`, `"another" "search" "term" \\backspace`],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              '(platform:"linux" OR platform:"windows") AND (fileType:"script" OR fileType:"archive") AND (tags:"dataCollection" OR tags:"userManagement") AND ((name:*\\\\test*\\\\search\\\\* OR updatedBy:*\\\\test*\\\\search\\\\* OR fileHash:*\\\\test*\\\\search\\\\*) OR (name:*\\"another\\"*\\"search\\"*\\"term\\"*\\\\backspace* OR updatedBy:*\\"another\\"*\\"search\\"*\\"term\\"*\\\\backspace* OR fileHash:*\\"another\\"*\\"search\\"*\\"term\\"*\\\\backspace*))',
          }),
        })
      );
    });

    it('should construct the correct KQL query when with mixed length arrays', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          os: ['linux', 'windows'],
          fileType: ['script'],
          category: ['dataCollection', 'userManagement'],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              '(platform:"linux" OR platform:"windows") AND fileType:"script" AND (tags:"dataCollection" OR tags:"userManagement")',
          }),
        })
      );
    });

    it('should construct the correct KQL query when some arrays are empty', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          os: ['linux', 'windows'],
          fileType: [],
          category: ['dataCollection', 'userManagement'],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery:
              '(platform:"linux" OR platform:"windows") AND (tags:"dataCollection" OR tags:"userManagement")',
          }),
        })
      );
    });

    it('should not include KQL filters when filter arrays are empty', async () => {
      await renderReactQueryHook(() =>
        useGetEndpointScriptsList({
          os: [],
          fileType: [],
          category: [],
        })
      );

      expect(apiMocks.responseProvider.getScriptsList).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            kuery: undefined,
          }),
        })
      );
    });
  });
});
