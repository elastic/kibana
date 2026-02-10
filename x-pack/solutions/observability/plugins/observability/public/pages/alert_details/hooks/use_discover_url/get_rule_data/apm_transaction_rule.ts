/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INDEX_PATTERN } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { escapeKuery, escapeQuotes } from '@kbn/es-query';
import type { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';

import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import type { TopAlert } from '../../../../../typings/alerts';

type ApmTransactionRuleDataResult = {
  discoverAppLocatorParams: DiscoverAppLocatorParams & {
    query: { query: string; language: 'kuery' };
  };
} | null;

export const apmTransactionAlertFieldsToKqlQuery = (alert: TopAlert): string => {
  const filters = [];
  const { fields } = alert as TopAlert<ObservabilityApmAlert>;

  const serviceName = fields[SERVICE_NAME];
  if (serviceName) {
    filters.push(`${escapeKuery(SERVICE_NAME)}:"${escapeQuotes(serviceName)}"`);
  }

  const transactionType = fields[TRANSACTION_TYPE];
  if (transactionType) {
    filters.push(`${escapeKuery(TRANSACTION_TYPE)}:"${escapeQuotes(transactionType)}"`);
  }

  const transactionName = fields[TRANSACTION_NAME];
  if (transactionName) {
    filters.push(`${escapeKuery(TRANSACTION_NAME)}:"${escapeQuotes(transactionName)}"`);
  }

  const environment = fields[SERVICE_ENVIRONMENT];
  if (environment && environment !== 'ENVIRONMENT_ALL') {
    filters.push(`${escapeKuery(SERVICE_ENVIRONMENT)}:"${escapeQuotes(environment)}"`);
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

  const queryText = (rule.params as { searchConfiguration?: { query?: { query?: string } } })
    .searchConfiguration?.query?.query;
  const generatedQuery = apmTransactionAlertFieldsToKqlQuery(alert);

  let kqlQuery: string;
  if (typeof queryText === 'string' && queryText) {
    kqlQuery = generatedQuery ? `(${queryText}) AND (${generatedQuery})` : queryText;
  } else {
    kqlQuery = generatedQuery;
  }

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
