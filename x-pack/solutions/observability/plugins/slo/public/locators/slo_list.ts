/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import deepmerge from 'deepmerge';
import { sloListLocatorID, type SloListLocatorParams } from '@kbn/deeplinks-observability';
import type { SearchState } from '../pages/slos/hooks/use_url_search_state';
import {
  DEFAULT_STATE,
  SLO_LIST_SEARCH_URL_STORAGE_KEY,
} from '../pages/slos/hooks/use_url_search_state';

export class SloListLocatorDefinition implements LocatorDefinition<SloListLocatorParams> {
  public readonly id = sloListLocatorID;

  public readonly getLocation = async ({ kqlQuery = '' }: SloListLocatorParams) => {
    const state: SearchState = deepmerge<SearchState>(DEFAULT_STATE, { kqlQuery });

    return {
      app: 'slo',
      path: setStateToKbnUrl(
        SLO_LIST_SEARCH_URL_STORAGE_KEY,
        state,
        {
          useHash: false,
          storeInHashQuery: false,
        },
        '/'
      ),
      state: {},
    };
  };
}
