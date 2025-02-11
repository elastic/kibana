/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Condition,
  RecursiveRecord,
  WiredStreamGetResponse,
  conditionToQueryDsl,
  getFields,
} from '@kbn/streams-schema';
import useToggle from 'react-use/lib/useToggle';
import { MappingRuntimeField, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { filter, switchMap } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
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
  const [documents, setDocuments] = useState<RecursiveRecord[]>([]);

  // Document counts / percentage
  const [isLoadingDocumentCounts, toggleIsLoadingDocumentCounts] = useToggle(false);
  const [documentCountsError, setDocumentCountsError] = useState();
  const [approximateMatchingPercentage, setApproximateMatchingPercentage] = useState<
    string | undefined
  >();

  const [refreshId, setRefreshId] = useState(0);

  const convertedCondition = useMemo(() => {
    const condition = options.condition ? emptyEqualsToAlways(options.condition) : undefined;
    return condition && 'always' in condition ? undefined : condition;
  }, [options.condition]);

  useEffect(() => {
    if (!options.start || !options.end) {
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
          body: getDocumentsSearchBody(options, runtimeMappings, convertedCondition),
        },
      })
      .subscribe({
        next: (result) => {
          if (!isRunningResponse(result)) {
            toggleIsLoadingDocuments(false);
          }

          if (result.rawResponse.hits?.hits) {
            setDocuments((prev) => result.rawResponse.hits.hits.map((hit) => hit._source));
          }
        },
        error: (e) => {
          setDocumentsError(e);
          toggleIsLoadingDocuments(false);
        },
      });

    toggleIsLoadingDocumentCounts(true);
    setApproximateMatchingPercentage(undefined);
    const documentCountsSubscription = data.search
      .search({
        params: {
          index: options.streamDefinition.stream.name,
          body: getDocumentCountForSampleRateSearchBody(options),
        },
      })
      .pipe(
        filter((result) => !isRunningResponse(result)),
        switchMap((response) => {
          const docCount =
            response.rawResponse.hits.total &&
            typeof response.rawResponse.hits.total !== 'number' &&
            'value' in response.rawResponse.hits.total
              ? response.rawResponse.hits.total.value
              : response.rawResponse.hits.total;

          const probability = calculateProbability(docCount);

          return data.search.search({
            params: {
              index: options.streamDefinition.stream.name,
              body: getDocumentCountsSearchBody(
                options,
                runtimeMappings,
                probability,
                convertedCondition
              ),
            },
          });
        })
      )
      .subscribe({
        next: (result) => {
          if (!isRunningResponse(result)) {
            toggleIsLoadingDocumentCounts(false);
          }
          // Aggregations don't return partial results so we just wait until the end
          if (result.rawResponse?.aggregations) {
            // We need to divide this by the sampling / probability factor:
            // https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-random-sampler-aggregation.html#random-sampler-special-cases
            const sampleAgg = result.rawResponse.aggregations.sample as {
              doc_count: number;
              probability: number;
              matching_docs: { doc_count: number };
            };
            const randomSampleDocCount = sampleAgg.doc_count / sampleAgg.probability;

            const matchingDocCount = sampleAgg.matching_docs.doc_count;

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
const getRuntimeMappings = (streamDefinition: WiredStreamGetResponse, condition?: Condition) => {
  if (!condition) return {};

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
  options: Options,
  runtimeMappings: MappingRuntimeFields,
  condition?: Condition
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

const getDocumentCountForSampleRateSearchBody = (options: Options) => {
  const { start, end } = options;

  const searchBody = {
    query: {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
    track_total_hits: true,
    size: 0,
  };
  return searchBody;
};

const getDocumentCountsSearchBody = (
  options: Options,
  runtimeMappings: MappingRuntimeFields,
  probability: number,
  condition?: Condition
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
          probability,
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

const calculateProbability = (docCount?: number) => {
  if (!docCount) return 1;
  const probabilityThreshold = 100000;
  if (docCount > probabilityThreshold) {
    const probability = probabilityThreshold / docCount;
    // Values between 0.5 and 1 are not supported by the random sampler
    return probability <= 0.5 ? probability : 1;
  } else {
    return 1;
  }
};
