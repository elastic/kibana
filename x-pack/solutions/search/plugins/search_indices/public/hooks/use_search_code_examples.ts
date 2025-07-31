/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSearchApiKey } from '@kbn/search-api-keys-components';
import {
  generateSearchQuery,
  buildFieldDescriptorForIndex,
  getDefaultQueryFields,
} from '@kbn/search-queries';
import { Mappings, SearchCodeSnippetParameters } from '../types';
import { useElasticsearchUrl } from './use_elasticsearch_url';
import { useKibana } from './use_kibana';
import { AvailableLanguages, Languages } from '../code_examples';
import { SearchCodeExample } from '../code_examples/search';

const DEFAULT_QUERY_STRING = 'REPLACE WITH YOUR QUERY';
const DEFAULT_QUERY_OBJECT = {
  retriever: {
    standard: {
      query: {
        query_string: {
          query: '*',
        },
      },
    },
  },
};

export const useSearchCodeExamples = (indexName: string, mappings?: Mappings) => {
  const elasticsearchURL = useElasticsearchUrl();
  const { apiKey } = useSearchApiKey();
  const { cloud } = useKibana().services;

  return useMemo(() => {
    let queryObject: ReturnType<typeof generateSearchQuery> = DEFAULT_QUERY_OBJECT;
    if (mappings) {
      try {
        const fields = buildFieldDescriptorForIndex(indexName, mappings);
        queryObject = generateSearchQuery(getDefaultQueryFields(fields), {}, fields, {
          rrf: true,
          queryString: DEFAULT_QUERY_STRING,
        });
      } catch {
        // Ignore Errors here and fallback to default query object
      }
    }
    const codeParams: SearchCodeSnippetParameters = {
      elasticsearchURL,
      apiKey: apiKey ?? undefined,
      indexName,
      queryObject,
      isServerless: cloud?.isServerlessEnabled ?? false,
    };

    const options = Object.entries(Languages).map(([key, language]) => ({
      language,
      code: SearchCodeExample[key as AvailableLanguages].searchCommand(codeParams),
    }));
    return {
      options,
      console: SearchCodeExample.sense.searchCommand(codeParams),
    };
  }, [indexName, mappings, elasticsearchURL, apiKey, cloud?.isServerlessEnabled]);
};
