/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Connector } from '@kbn/search-connectors';

import { Status } from '../../../../../../../common/types/api';

import {
  UpdateHtmlExtractionActions,
  UpdateHtmlExtractionApiLogic,
} from '../../../../api/crawler/update_html_extraction_api_logic';
import { CachedFetchIndexApiLogicActions } from '../../../../api/index/cached_fetch_index_api_logic';
import { isCrawlerIndex } from '../../../../utils/indices';
import { IndexViewLogic } from '../../index_view_logic';

interface CrawlerConfigurationLogicActions {
  apiError: UpdateHtmlExtractionActions['apiError'];
  apiSuccess: UpdateHtmlExtractionActions['apiSuccess'];
  fetchIndex: () => void;
  fetchIndexApiSuccess: CachedFetchIndexApiLogicActions['apiSuccess'];
  htmlExtraction: boolean;
  makeRequest: UpdateHtmlExtractionActions['makeRequest'];
  updateHtmlExtraction(htmlExtraction: boolean): { htmlExtraction: boolean };
}

interface CrawlerConfigurationLogicValues {
  connector: Connector | undefined;
  indexName: string;
  localHtmlExtraction: boolean | null;
  status: Status;
}

export const CrawlerConfigurationLogic = kea<
  MakeLogicType<CrawlerConfigurationLogicValues, CrawlerConfigurationLogicActions>
>({
  actions: {
    updateHtmlExtraction: (htmlExtraction) => ({ htmlExtraction }),
  },
  connect: {
    actions: [
      IndexViewLogic,
      ['fetchIndex', 'fetchIndexApiSuccess'],
      UpdateHtmlExtractionApiLogic,
      ['apiSuccess', 'makeRequest'],
    ],
    values: [IndexViewLogic, ['connector', 'indexName'], UpdateHtmlExtractionApiLogic, ['status']],
  },
  listeners: ({ actions, values }) => ({
    apiSuccess: () => {
      actions.fetchIndex();
    },
    updateHtmlExtraction: ({ htmlExtraction }) => {
      actions.makeRequest({ htmlExtraction, indexName: values.indexName });
    },
  }),
  path: ['enterprise_search', 'search_index', 'crawler', 'configuration'],
  reducers: {
    localHtmlExtraction: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        apiSuccess: (_, { htmlExtraction }) => htmlExtraction,
        // @ts-expect-error upgrade typescript v5.1.6
        fetchIndexApiSuccess: (_, index) => {
          if (isCrawlerIndex(index)) {
            return index.connector.configuration.extract_full_html?.value ?? null;
          }
          return null;
        },
      },
    ],
  },
  selectors: ({ selectors }) => ({
    htmlExtraction: [
      () => [selectors.connector, selectors.localHtmlExtraction],
      (connector: Connector | null, localHtmlExtraction: boolean | null) =>
        localHtmlExtraction !== null
          ? localHtmlExtraction
          : connector?.configuration.extract_full_html?.value ?? false,
    ],
  }),
});
