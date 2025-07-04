/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';

import { INDICES_APP_ID } from '../../common';
import { SearchIndexDetailsTabValues } from '../routes';

export interface SearchIndicesLocatorParams extends SerializableRecord {
  indexName: string;
  detailsTabId: string;
}

export class SearchIndicesLocatorDefinition
  implements LocatorDefinition<SearchIndicesLocatorParams>
{
  public readonly getLocation = async (params: SearchIndicesLocatorParams) => {
    const path = `/index_details/${params.indexName}`;

    return {
      app: INDICES_APP_ID,
      path: SearchIndexDetailsTabValues.includes(params.detailsTabId)
        ? `${path}/${params.detailsTabId}`
        : path,
      state: {},
    };
  };

  public readonly id = 'SEARCH_INDEX_DETAILS_LOCATOR_ID';
}
