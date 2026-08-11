/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { SEARCH_INDEX_MANAGEMENT as SEARCH_INDEX_MANAGEMENT_APP_ID } from '@kbn/deeplinks-search';

import type { SearchIndexManagementLocatorParams } from './types';
import { SEARCH_INDEX_MANAGEMENT_LOCATOR_ID } from './constants';
export { SEARCH_INDEX_MANAGEMENT_LOCATOR_ID };

export interface SearchIndexManagementLocatorDependencies {
  /** Gets chrome style at runtime (when getLocation is called) */
  getChromeStyle: () => 'classic' | 'project' | undefined;
  /** Platform index management locator; used when chrome style is classic */
  indexManagementLocator?: LocatorPublic<IndexManagementLocatorParams>;
}

export class SearchIndexManagementLocatorDefinition
  implements LocatorDefinition<SearchIndexManagementLocatorParams>
{
  public readonly id = SEARCH_INDEX_MANAGEMENT_LOCATOR_ID;

  constructor(private readonly deps: SearchIndexManagementLocatorDependencies) {}

  public readonly getLocation = async (params: SearchIndexManagementLocatorParams) => {
    const chromeStyle = await this.deps.getChromeStyle();

    if (chromeStyle === 'project' && this.deps.indexManagementLocator) {
      const location = await this.deps.indexManagementLocator.getLocation(params);
      if (location?.app) return location;
    }

    switch (params.page) {
      case 'index_list':
        return {
          app: SEARCH_INDEX_MANAGEMENT_APP_ID,
          path: '/indices',
          state: {},
        };
      case 'index_details': {
        let path = `/indices/index_details?indexName=${encodeURIComponent(params.indexName)}`;
        if (params.tab) {
          path += `&tab=${encodeURIComponent(params.tab)}`;
        }
        return {
          app: SEARCH_INDEX_MANAGEMENT_APP_ID,
          path,
          state: {},
        };
      }
      default:
        return {
          app: SEARCH_INDEX_MANAGEMENT_APP_ID,
          path: '/indices',
          state: {},
        };
    }
  };
}
