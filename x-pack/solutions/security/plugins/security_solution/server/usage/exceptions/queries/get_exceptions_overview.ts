/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  LIST_TYPES,
  type ExceptionMetricsSchema,
  type ExceptionsOverviewAggsResponse,
  type ItemsInfoSchema,
  type ListType,
} from '../types';
import { computeMedian, isApprovedListType } from '../utils';

export interface GetExceptionsOverviewOptions {
  logger: Logger;
  esClient: ElasticsearchClient;
}

interface ListInfoInternal {
  lists: number;
  total_items: number;
  max_items_per_list: number;
  min_items_per_list: number;
  median_items_per_list: number;
  _item_counts: number[];
}

const ITEMS_OVERVIEW_METRICS_DEFAULT_STATE: ItemsInfoSchema = {
  total: 0,
  has_expire_time: 0,
  are_expired: 0,
  has_comments: 0,
  entries: {
    match: 0,
    list: 0,
    nested: 0,
    match_any: 0,
    exists: 0,
    wildcard: 0,
  },
};

const LISTS_OVERVIEW_METRICS_DEFAULT_STATE_INTERNAL: Record<ListType, ListInfoInternal> = {
  endpoint: {
    lists: 0,
    total_items: 0,
    max_items_per_list: 0,
    min_items_per_list: 0,
    median_items_per_list: 0,
    _item_counts: [],
  },
  rule_default: {
    lists: 0,
    total_items: 0,
    max_items_per_list: 0,
    min_items_per_list: 0,
    median_items_per_list: 0,
    _item_counts: [],
  },
  detection: {
    lists: 0,
    total_items: 0,
    max_items_per_list: 0,
    min_items_per_list: 0,
    median_items_per_list: 0,
    _item_counts: [],
  },
};

const METRICS_DEFAULT_STATE_INTERNAL = {
  lists_overview: LISTS_OVERVIEW_METRICS_DEFAULT_STATE_INTERNAL,
  items_overview: ITEMS_OVERVIEW_METRICS_DEFAULT_STATE,
};

export const getExceptionsOverview = async ({
  logger,
  esClient,
}: GetExceptionsOverviewOptions): Promise<ExceptionMetricsSchema> => {
  try {
    const query: SearchRequest = {
      expand_wildcards: ['open' as const, 'hidden' as const],
      index: '.kibana*',
      ignore_unavailable: false,
      size: 0, // no query results required - only aggregation quantity
      query: {
        bool: {
          should: [
            { term: { type: 'exception-list' } },
            { term: { type: 'exception-list-agnostic' } },
          ],
          must_not: [
            {
              terms: {
                'exception-list.list_id': [
                  'endpoint_trusted_apps',
                  'endpoint_event_filters',
                  'endpoint_host_isolation_exceptions',
                  'endpoint_blocklists',
                ],
              },
            },
            {
              terms: {
                'exception-list-agnostic.list_id': [
                  'endpoint_trusted_apps',
                  'endpoint_event_filters',
                  'endpoint_host_isolation_exceptions',
                  'endpoint_blocklists',
                ],
              },
            },
          ],
        },
      },
      aggs: {
        single_space_lists: {
          terms: {
            field: 'exception-list.list_id',
          },
          aggs: {
            list_details: {
              filter: {
                term: {
                  'exception-list.list_type': 'list',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list.type',
                  },
                },
              },
            },
            items_entries_type: {
              filter: {
                term: {
                  'exception-list.list_type': 'item',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list.entries.type',
                  },
                },
              },
            },
            non_empty_comments: {
              filter: {
                exists: {
                  field: 'exception-list.comments.comment',
                },
              },
            },
            expire_time_exists: {
              filter: {
                exists: {
                  field: 'exception-list.expire_time',
                },
              },
            },
            expire_time_expired: {
              filter: {
                range: {
                  'exception-list.expire_time': {
                    lt: 'now',
                  },
                },
              },
            },
          },
        },
        agnostic_space_lists: {
          terms: {
            field: 'exception-list-agnostic.list_id',
          },
          aggs: {
            list_details: {
              filter: {
                term: {
                  'exception-list-agnostic.list_type': 'list',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list-agnostic.type',
                  },
                },
              },
            },
            items_entries_type: {
              filter: {
                term: {
                  'exception-list-agnostic.list_type': 'item',
                },
              },
              aggs: {
                by_type: {
                  terms: {
                    field: 'exception-list-agnostic.entries.type',
                  },
                },
              },
            },
            non_empty_comments: {
              filter: {
                exists: {
                  field: 'exception-list-agnostic.comments.comment',
                },
              },
            },
            expire_time_exists: {
              filter: {
                exists: {
                  field: 'exception-list-agnostic.expire_time',
                },
              },
            },
            expire_time_expired: {
              filter: {
                range: {
                  'exception-list-agnostic.expire_time': {
                    lt: 'now',
                  },
                },
              },
            },
          },
        },
      },
    };

    const response = await esClient.search(query);
    const { aggregations: aggs } = response as unknown as ExceptionsOverviewAggsResponse;
    const agnosticLists = aggs.agnostic_space_lists.buckets;
    const singleSpaceLists = aggs.single_space_lists.buckets;
    const allLists = [...agnosticLists, ...singleSpaceLists];
    const reduced = allLists.reduce((aggResult, list) => {
      const listType = list.list_details.by_type.buckets[0]?.key;
      const items = list.doc_count - 1;
      const itemsWithComments = list.non_empty_comments.doc_count;
      const itemsWithExpireTime = list.expire_time_exists.doc_count;
      const itemsExpired = list.expire_time_expired.doc_count;
      const entries = list.items_entries_type.by_type.buckets.reduce(
        (acc, entry) => {
          const entryType = entry.key as keyof typeof acc;
          const entryCount = entry.doc_count;
          if (Object.keys(acc).includes(entryType)) {
            return {
              ...acc,
              [entryType]: acc[entryType] + entryCount,
            };
          }

          return acc;
        },
        {
          match: 0,
          list: 0,
          nested: 0,
          match_any: 0,
          exists: 0,
          wildcard: 0,
        }
      );

      if (!listType || !isApprovedListType(listType)) {
        return aggResult;
      }
      const listInfo = aggResult.lists_overview[listType];

      return {
        lists_overview: {
          ...aggResult.lists_overview,
          [listType]: {
            ...listInfo,
            lists: listInfo.lists + 1,
            total_items: listInfo.total_items + items,
            max_items_per_list: Math.max(listInfo.max_items_per_list, items),
            min_items_per_list:
              listInfo.min_items_per_list === 0
                ? items
                : Math.min(listInfo.min_items_per_list, items),
            _item_counts: [...listInfo._item_counts, items],
          },
        },
        items_overview: {
          ...aggResult.items_overview,
          total: aggResult.items_overview.total + items,
          has_expire_time: aggResult.items_overview.has_expire_time + itemsWithExpireTime,
          are_expired: aggResult.items_overview.are_expired + itemsExpired,
          has_comments: aggResult.items_overview.has_comments + itemsWithComments,
          entries: {
            match: aggResult.items_overview.entries.match + entries.match,
            list: aggResult.items_overview.entries.list + entries.list,
            nested: aggResult.items_overview.entries.nested + entries.nested,
            match_any: aggResult.items_overview.entries.match_any + entries.match_any,
            exists: aggResult.items_overview.entries.exists + entries.exists,
            wildcard: aggResult.items_overview.entries.wildcard + entries.wildcard,
          },
        },
      };
    }, METRICS_DEFAULT_STATE_INTERNAL);

    // Compute median and strip _item_counts for output
    const listsOverview: ExceptionMetricsSchema['lists_overview'] = LIST_TYPES.reduce(
      (acc, type) => {
        const info = reduced.lists_overview[type];
        acc[type] = {
          lists: info.lists,
          total_items: info.total_items,
          max_items_per_list: info.max_items_per_list,
          min_items_per_list: info.min_items_per_list,
          median_items_per_list: computeMedian(info._item_counts),
        };
        return acc;
      },
      {
        endpoint: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        rule_default: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        detection: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
      }
    );

    return {
      lists_overview: listsOverview,
      items_overview: reduced.items_overview,
    };
  } catch (error) {
    // Return schema-compliant empty state
    return {
      lists_overview: {
        endpoint: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        rule_default: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
        detection: {
          lists: 0,
          total_items: 0,
          max_items_per_list: 0,
          min_items_per_list: 0,
          median_items_per_list: 0,
        },
      },
      items_overview: { ...ITEMS_OVERVIEW_METRICS_DEFAULT_STATE },
    };
  }
};
