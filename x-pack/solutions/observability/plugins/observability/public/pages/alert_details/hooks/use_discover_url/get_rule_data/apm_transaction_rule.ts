/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INDEX_PATTERN } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { transactionErrorRateParamsSchema } from '@kbn/response-ops-rule-params/transaction_error_rate';
import type { transactionDurationParamsSchema } from '@kbn/response-ops-rule-params/transaction_duration';
import type { TypeOf } from '@kbn/config-schema';
import { escapeKuery, escapeQuotes } from '@kbn/es-query';

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import type { TopAlert } from '../../../../../typings/alerts';

type TransactionRuleParams =
  | TypeOf<typeof transactionErrorRateParamsSchema>
  | TypeOf<typeof transactionDurationParamsSchema>;

type ApmTransactionRuleDataResult = {
  discoverAppLocatorParams: DiscoverAppLocatorParams & {
    query: { query: string; language: 'kuery' };
  };
} | null;

export const apmTransactionParamsToKqlQuery = (params: TransactionRuleParams): string => {
  const filters = [];

  if (params.serviceName) {
    filters.push(`${escapeKuery(SERVICE_NAME)}:"${escapeQuotes(params.serviceName)}"`);
  }

  if (params.transactionType) {
    filters.push(`${escapeKuery(TRANSACTION_TYPE)}:"${escapeQuotes(params.transactionType)}"`);
  }

  if (params.transactionName) {
    filters.push(`${escapeKuery(TRANSACTION_NAME)}:"${escapeQuotes(params.transactionName)}"`);
  }

  if (params.environment && params.environment !== 'ENVIRONMENT_ALL') {
    filters.push(`${escapeKuery(SERVICE_ENVIRONMENT)}:"${escapeQuotes(params.environment)}"`);
  }

  if (filters.length === 0) {
    return '';
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return `(${filters.join(' AND ')})`;
};

export const getApmTransactionRuleData = ({
  alert,
  rule,
}: {
  alert: TopAlert;
  rule: Rule;
}): ApmTransactionRuleDataResult => {
  const indexPattern =
    ALERT_INDEX_PATTERN in alert.fields ? alert.fields[ALERT_INDEX_PATTERN] : undefined;

  if (typeof indexPattern !== 'string') {
    return null;
  }

  const ruleParams = rule.params as TransactionRuleParams;

  const queryText = ruleParams.searchConfiguration?.query?.query;
  const kqlQuery =
    typeof queryText === 'string' && queryText
      ? queryText
      : apmTransactionParamsToKqlQuery(ruleParams);

  const discoverAppLocatorParams = {
    dataViewSpec: {
      title: indexPattern,
      timeFieldName: '@timestamp',
    },
    query: {
      language: 'kuery' as const,
      query: kqlQuery,
    },
  };

  return {
    discoverAppLocatorParams,
  };
};

export const getApmTransactionRuleDataOrEmpty = ({
  alert,
  rule,
}: {
  alert: TopAlert;
  rule: Rule;
}) => {
  return getApmTransactionRuleData({ alert, rule }) ?? {};
};
