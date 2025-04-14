/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { logQueryRequest } from '../utils/logged_requests';
import * as i18n from '../translations';
import type { SignalSource } from '../types';

interface FetchedDocument {
  fields: estypes.SearchHit['fields'];
  _source?: SignalSource;
  _index: estypes.SearchHit['_index'];
  _version: estypes.SearchHit['_version'];
}

interface FetchSourceDocumentsArgs {
  isRuleAggregating: boolean;
  esClient: ElasticsearchClient;
  index: string[];
  results: Array<Record<string, string | null>>;
  loggedRequests?: RulePreviewLoggedRequest[];
}
/**
 * fetches source documents by list of their ids
 * it used for a case when non-aggregating has _id property to enrich alert with source document,
 * if some of the properties missed from resulted query
 */
export const fetchSourceDocuments = async ({
  isRuleAggregating,
  results,
  esClient,
  index,
  loggedRequests,
}: FetchSourceDocumentsArgs): Promise<Record<string, FetchedDocument>> => {
  const ids = results.reduce<string[]>((acc, doc) => {
    if (doc._id) {
      acc.push(doc._id);
    }
    return acc;
  }, []);

  // we will fetch source documents only for non-aggregating rules, since aggregating do not have _id
  if (ids.length === 0 || isRuleAggregating) {
    return {};
  }

  const idsQuery = {
    query: {
      bool: {
        filter: {
          ids: { values: ids },
        },
      },
    },
  };

  const searchBody = {
    query: idsQuery.query,
    _source: true,
    fields: ['*'],
  };
  const ignoreUnavailable = true;

  if (loggedRequests) {
    loggedRequests.push({
      request: logQueryRequest(searchBody, { index, ignoreUnavailable }),
      description: i18n.FIND_SOURCE_DOCUMENTS_REQUEST_DESCRIPTION,
    });
  }

  const response = await esClient.search<SignalSource>({
    index,
    body: searchBody,
    ignore_unavailable: ignoreUnavailable,
  });

  if (loggedRequests) {
    loggedRequests[loggedRequests.length - 1].duration = response.took;
  }

  return response.hits.hits.reduce<Record<string, FetchedDocument>>((acc, hit) => {
    if (hit._id) {
      acc[hit._id] = {
        fields: hit.fields,
        _source: hit._source,
        _index: hit._index,
        _version: hit._version,
      };
    }
    return acc;
  }, {});
};
