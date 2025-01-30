/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Condition,
  WiredStreamGetResponse,
  conditionToQueryDsl,
  getFields,
} from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import {
  MappingRuntimeField,
  MappingRuntimeFields,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import { useKibana } from '../use_kibana';
import { emptyEqualsToAlways } from '../../util/condition';

interface Options {
  condition?: Condition;
  start?: number;
  end?: number;
  size?: number;
  streamDefinition: WiredStreamGetResponse;
}

export const useAsyncSample = (options: Options) => {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  // Documents
  const [isLoadingDocuments, toggleIsLoadingDocuments] = useToggle(false);
  const [documentsError, setDocumentsError] = useState();
  const [documents, setDocuments] = useState<Array<SearchHit<any>>>([]);

  // Document counts / percentage
  const [isLoadingDocumentCounts, toggleIsLoadingDocumentCounts] = useToggle(false);
  const [documentCountsError, setDocumentCountsError] = useState();
  const [approximateMatchingPercentage, setApproximateMatchingPercentage] = useState<
    string | undefined
  >();

  const [refreshId, setRefreshId] = useState(0);

  const convertedCondition = useMemo(() => {
    return options.condition ? emptyEqualsToAlways(options.condition) : undefined;
  }, [options.condition]);

  useEffect(() => {
    if (!convertedCondition || !options.start || !options.end) {
      setDocuments([]);
      setApproximateMatchingPercentage(undefined);
      return;
    }

    const runtimeMappings = getRuntimeMappings(options.streamDefinition, convertedCondition);

    // Documents
    toggleIsLoadingDocuments(true);
    setDocuments([]);
    const documentSubscription = data.search
      .search({
        params: {
          index: options.streamDefinition.stream.name,
          body: getDocumentsSearchBody(convertedCondition, options, runtimeMappings),
        },
      })
      .subscribe({
        next: (result) => {
          if (result.rawResponse.hits?.hits) {
            setDocuments((prev) =>
              prev.concat(result.rawResponse.hits.hits.map((hit) => hit._source))
            );
          }
          if (!result.isRunning) {
            toggleIsLoadingDocuments(false);
          }
        },
        error: (e) => {
          setDocumentsError(e);
          toggleIsLoadingDocuments(false);
        },
      });

    // Document counts
    toggleIsLoadingDocumentCounts(true);
    setApproximateMatchingPercentage(undefined);
    const documentCountsSubscription = data.search
      .search({
        params: {
          index: options.streamDefinition.stream.name,
          body: getDocumentCountsSearchBody(convertedCondition, options, runtimeMappings),
        },
      })
      .subscribe({
        next: (result) => {
          if (!result.isRunning) {
            toggleIsLoadingDocumentCounts(false);
          }
          // Aggregations don't return partial results so we just wait until the end
          if (!result.isRunning && result.rawResponse?.aggregations) {
            const randomSampleDocCount = result.rawResponse.aggregations.sample.doc_count;
            const matchingDocCount = result.rawResponse.aggregations.sample.matching_docs.doc_count;

            const percentage = (100 * matchingDocCount) / randomSampleDocCount;

            setApproximateMatchingPercentage(percentage.toFixed(2));
          }
        },
        error: (e) => {
          toggleIsLoadingDocumentCounts(false);
          setDocumentCountsError(e);
        },
      });

    return () => {
      documentSubscription.unsubscribe();
      documentCountsSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.search,
    convertedCondition,
    options.start,
    options.end,
    options.size,
    options.streamDefinition,
    refreshId,
  ]);

  return {
    isLoadingDocuments,
    documentsError,
    documents,
    isLoadingDocumentCounts,
    documentCountsError,
    approximateMatchingPercentage,
    refresh: () => setRefreshId((id) => id + 1),
  };
};

export type AsyncSample = ReturnType<typeof useAsyncSample>;

// Create runtime mappings for fields that aren't mapped.
// Conditions could be using fields which are not indexed or they could use it with other types than they are eventually mapped as.
// Because of this we can't rely on mapped fields to draw a sample, instead we need to use runtime fields to simulate what happens during
// ingest in the painless condition checks.
const getRuntimeMappings = (streamDefinition: WiredStreamGetResponse, condition: Condition) => {
  const wiredMappedFields =
    'wired' in streamDefinition.stream.ingest ? streamDefinition.stream.ingest.wired.fields : {};
  const mappedFields = Object.keys(wiredMappedFields).concat(
    Object.keys(streamDefinition.inherited_fields)
  );

  return Object.fromEntries(
    getFields(condition)
      .filter((field) => !mappedFields.includes(field.name))
      .map((field) => [
        field.name,
        { type: field.type === 'string' ? 'keyword' : 'double' } as MappingRuntimeField,
      ])
  );
};

const getDocumentsSearchBody = (
  condition: Condition,
  options: Options,
  runtimeMappings: MappingRuntimeFields
) => {
  const { size, start, end } = options;

  const searchBody = {
    query: {
      bool: {
        must: [
          condition ? conditionToQueryDsl(condition) : { match_all: {} },
          {
            range: {
              '@timestamp': {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    terminate_after: size,
    track_total_hits: false,
    size,
  };
  return searchBody;
};

const getDocumentCountsSearchBody = (
  condition: Condition,
  options: Options,
  runtimeMappings: MappingRuntimeFields
) => {
  const { start, end } = options;

  const searchBody = {
    query: {
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    aggs: {
      sample: {
        random_sampler: {
          probability: 0.1,
        },
        aggs: {
          matching_docs: {
            filter: condition ? conditionToQueryDsl(condition) : { match_all: {} },
          },
        },
      },
    },
    runtime_mappings: runtimeMappings,
    size: 0,
    _source: false,
    track_total_hits: false,
  };
  return searchBody;
};
