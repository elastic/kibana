/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { SearchEsListItemSchema } from '../../schemas/elastic_response';
import { streamListValues } from '../lookup/paginate_hits';
import { findSourceValue } from '../utils/find_source_value';

/**
 * Pull based streaming read of a list stored in the shared `.items` data stream
 * (the pre-lookup storage), one batch at a time. It shares the paging of the lookup
 * path; the only differences are the query (filter by `list_id`, since the index is
 * shared across lists) and the extractor (`findSourceValue` reconstructs the authored
 * value from the per type field, handling ranges and geo like the existing export).
 */
export const streamSharedItemValues = ({
  esClient,
  listId,
  listItemIndex,
}: {
  esClient: ElasticsearchClient;
  listId: string;
  listItemIndex: string;
}): AsyncGenerator<string[], void, void> =>
  streamListValues<SearchEsListItemSchema>({
    esClient,
    extract: (source) => (source != null ? findSourceValue(source) : undefined),
    index: listItemIndex,
    query: { term: { list_id: listId } },
  });
