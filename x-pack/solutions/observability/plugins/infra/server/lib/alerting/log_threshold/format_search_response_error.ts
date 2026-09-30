/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';
import type * as t from 'io-ts';

export interface LogThresholdSearchResponseErrorContext {
  indexPattern?: string | string[];
  groupBy?: string[];
}

export interface LogThresholdSearchResponseForErrorFormatting {
  aggregations?: unknown;
  _shards?: {
    failed?: number;
  };
}

export const getSearchResponseErrorContext = (
  query: object,
  errorContext: LogThresholdSearchResponseErrorContext = {}
): LogThresholdSearchResponseErrorContext => {
  const indexPattern =
    errorContext.indexPattern ?? (query as estypes.SearchRequest).index ?? undefined;

  return {
    ...errorContext,
    indexPattern,
  };
};

const formatIndexPattern = (indexPattern: string | string[] | undefined): string => {
  if (!indexPattern) {
    return i18n.translate('xpack.infra.logs.alerting.searchResponseError.unknownIndexPattern', {
      defaultMessage: 'unknown',
    });
  }

  return Array.isArray(indexPattern) ? indexPattern.join(', ') : indexPattern;
};

const getMissingAggregationsMessage = ({
  indexPattern,
  groupBy,
}: LogThresholdSearchResponseErrorContext): string => {
  const formattedIndexPattern = formatIndexPattern(indexPattern);

  if (groupBy && groupBy.length > 0) {
    return i18n.translate(
      'xpack.infra.logs.alerting.searchResponseError.missingGroupedAggregations',
      {
        defaultMessage:
          'Elasticsearch returned no aggregation results for index pattern "{indexPattern}". This can happen when log sources have changed (Advanced Settings > observability:logSources), the index pattern no longer matches any indices, or group-by fields ({groupByFields}) are missing from the index mapping.',
        values: {
          indexPattern: formattedIndexPattern,
          groupByFields: groupBy.join(', '),
        },
      }
    );
  }

  return i18n.translate(
    'xpack.infra.logs.alerting.searchResponseError.missingUngroupedAggregations',
    {
      defaultMessage:
        'Elasticsearch returned no aggregation results for index pattern "{indexPattern}". This can happen when log sources have changed (Advanced Settings > observability:logSources) or the index pattern no longer matches any indices.',
      values: {
        indexPattern: formattedIndexPattern,
      },
    }
  );
};

const getShardFailureMessage = ({
  indexPattern,
  failedShards,
}: LogThresholdSearchResponseErrorContext & { failedShards: number }): string => {
  return i18n.translate('xpack.infra.logs.alerting.searchResponseError.shardFailures', {
    defaultMessage:
      'Elasticsearch returned shard failures while querying index pattern "{indexPattern}" ({failedShards} failed shards). Check that log sources (Advanced Settings > observability:logSources) and group-by fields match the index mapping.',
    values: {
      indexPattern: formatIndexPattern(indexPattern),
      failedShards,
    },
  });
};

export const formatLogThresholdSearchResponseError = ({
  searchResponse,
  validationErrors,
  responseType,
  errorContext = {},
}: {
  searchResponse: LogThresholdSearchResponseForErrorFormatting;
  validationErrors: t.Errors;
  responseType: 'grouped' | 'ungrouped';
  errorContext?: LogThresholdSearchResponseErrorContext;
}): string => {
  if (responseType === 'grouped' && searchResponse.aggregations === undefined) {
    return getMissingAggregationsMessage(errorContext);
  }

  const failedShards = searchResponse._shards?.failed ?? 0;
  if (failedShards > 0) {
    return getShardFailureMessage({ ...errorContext, failedShards });
  }

  const errorMessages = formatErrors(validationErrors);
  const responseLabel =
    responseType === 'grouped'
      ? i18n.translate('xpack.infra.logs.alerting.searchResponseError.groupedResponseLabel', {
          defaultMessage: 'grouped',
        })
      : i18n.translate('xpack.infra.logs.alerting.searchResponseError.ungroupedResponseLabel', {
          defaultMessage: 'ungrouped',
        });

  return i18n.translate('xpack.infra.logs.alerting.searchResponseError.validationFailed', {
    defaultMessage: 'Failed to parse {responseType} search response: {details}',
    values: {
      responseType: responseLabel,
      details: errorMessages.join(', '),
    },
  });
};
