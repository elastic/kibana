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
          defaultMessage: `The EQL query failed to run successfully due to unavailable shards: {shardFailures}`,
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

export const FIND_THRESHOLD_BUCKETS_DESCRIPTION = (afterBucket?: string) =>
  afterBucket
    ? i18n.translate(
        'xpack.securitySolution.detectionEngine.esqlRuleType.findThresholdRuleBucketsAfterDescription',
        {
          defaultMessage: 'Find all terms that exceeds threshold value after {afterBucket}',
          values: { afterBucket },
        }
      )
    : i18n.translate(
        'xpack.securitySolution.detectionEngine.esqlRuleType.findThresholdRuleBucketsDescription',
        {
          defaultMessage: 'Find all terms that exceeds threshold value',
        }
      );

export const ML_SEARCH_ANOMALIES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.esqlRuleType.mlSearchAnomaliesRequestDescription',
  {
    defaultMessage: 'Find all anomalies',
  }
);

export const FIND_EVENTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.queryRuleType.findEventsDescription',
  {
    defaultMessage: 'Find events',
  }
);

export const FIND_EVENTS_AFTER_CURSOR_DESCRIPTION = (cursor?: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.queryRuleType.findEventsAfterCursorDescription',
    {
      defaultMessage: 'Find events after cursor {cursor}',
      values: { cursor },
    }
  );

export const FIND_ALL_NEW_TERMS_FIELDS_DESCRIPTION = (afterKey?: string) =>
  afterKey
    ? i18n.translate(
        'xpack.securitySolution.detectionEngine.newTermsRuleType.findAllNewTermsFieldsAfterDescription',
        {
          defaultMessage: 'Find all values after {afterKey}',
          values: { afterKey },
        }
      )
    : i18n.translate(
        'xpack.securitySolution.detectionEngine.newTermsRuleType.findAllNewTermsFieldsDescription',
        {
          defaultMessage: 'Find all values',
        }
      );

export const FIND_NEW_TERMS_VALUES_DESCRIPTION = (afterKey?: string) =>
  afterKey
    ? i18n.translate(
        'xpack.securitySolution.detectionEngine.newTermsRuleType.findNewTermsValuesAfterDescription',
        {
          defaultMessage: 'Find new values after {afterKey}',
          values: { afterKey },
        }
      )
    : i18n.translate(
        'xpack.securitySolution.detectionEngine.newTermsRuleType.findNewTermsValuesDescription',
        {
          defaultMessage: 'Find new values',
        }
      );

export const FIND_NEW_TERMS_EVENTS_DESCRIPTION = (afterKey?: string) =>
  afterKey
    ? i18n.translate(
        'xpack.securitySolution.detectionEngine.newTermsRuleType.findNewTermsEventsAfterDescription',
        {
          defaultMessage: 'Find documents associated with new values after {afterKey}',
          values: { afterKey },
        }
      )
    : i18n.translate(
        'xpack.securitySolution.detectionEngine.newTermsRuleType.findNewTermsEventsDescription',
        {
          defaultMessage: 'Find documents associated with new values',
        }
      );
