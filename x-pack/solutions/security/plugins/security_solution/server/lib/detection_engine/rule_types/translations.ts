/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESQL_SEARCH_REQUEST_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlRuleType.esqlSearchRequestDescription',
  {
    defaultMessage: 'ES|QL request to find all matches',
  }
);

export const FIND_SOURCE_DOCUMENTS_REQUEST_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlRuleType.findSourceDocumentsRequestDescription',
  {
    defaultMessage: 'Retrieve source documents when ES|QL query is not aggregable',
  }
);

export const EQL_SEARCH_REQUEST_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlRuleType.eqlSearchRequestDescription',
  {
    defaultMessage: 'EQL request to find all matches',
  }
);

export const EQL_SHARD_FAILURE_MESSAGE = (
  isEqlSequenceQuery: boolean,
  shardFailuresMessage: string
) =>
  isEqlSequenceQuery
    ? i18n.translate(
        'xpack.securitySolution.detectionEngine.eqlSequenceRuleType.eqlShardFailures',
        {
          defaultMessage: `The EQL query failed to run successfully on the following shards: {shardFailures}`,
          values: {
            shardFailures: shardFailuresMessage,
          },
        }
      )
    : i18n.translate('xpack.securitySolution.detectionEngine.eqlEventRuleType.eqlShardFailures', {
        defaultMessage: `The EQL event query was only executed on the available shards. The query failed to run successfully on the following shards: {shardFailures}`,
        values: {
          shardFailures: shardFailuresMessage,
        },
      });
