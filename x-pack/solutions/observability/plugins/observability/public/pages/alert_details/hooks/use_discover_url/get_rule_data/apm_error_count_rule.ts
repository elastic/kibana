/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { ALERT_INDEX_PATTERN } from '@kbn/rule-data-utils';
import { escapeKuery, escapeQuotes } from '@kbn/es-query';
import {
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '@kbn/apm-types';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import type { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import type { TopAlert } from '../../../../../typings/alerts';

const ERROR_COUNT_GROUP_BY_FIELDS = [
  SERVICE_NAME,
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
  TRANSACTION_NAME,
] as const;

const apmErrorCountAlertFieldsToKqlQuery = (alert: TopAlert): string => {
  const { fields } = alert as TopAlert<ObservabilityApmAlert>;

  const filters = ERROR_COUNT_GROUP_BY_FIELDS.reduce<string[]>((acc, fieldName) => {
    const value = fields[fieldName];
    if (value) {
      acc.push(`${escapeKuery(fieldName)}:"${escapeQuotes(value)}"`);
    }
    return acc;
  }, []);

  const environment = fields[SERVICE_ENVIRONMENT];
  if (environment && environment !== 'ENVIRONMENT_ALL') {
    filters.push(`${escapeKuery(SERVICE_ENVIRONMENT)}:"${escapeQuotes(environment)}"`);
  }

  filters.push(`${escapeKuery(PROCESSOR_EVENT)}:"${escapeQuotes(ProcessorEvent.error)}"`);

  if (filters.length === 1) {
    return filters[0];
  }

  return `(${filters.join(' AND ')})`;
};

type ApmErrorCountRuleDataResult = {
  discoverAppLocatorParams: DiscoverAppLocatorParams & {
    query: { query: string; language: 'kuery' };
  };
} | null;

export const getApmErrorCountRuleData = ({
  alert,
  rule,
}: {
  alert: TopAlert;
  rule: Rule;
}): ApmErrorCountRuleDataResult => {
  const indexPattern =
    ALERT_INDEX_PATTERN in alert.fields ? alert.fields[ALERT_INDEX_PATTERN] : undefined;

  if (typeof indexPattern !== 'string') {
    return null;
  }

  const queryText = (rule.params as { searchConfiguration?: { query?: { query?: string } } })
    .searchConfiguration?.query?.query;
  const generatedQuery = apmErrorCountAlertFieldsToKqlQuery(alert);

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

export const getApmErrorCountRuleDataOrEmpty = ({ alert, rule }: { alert: TopAlert; rule: Rule }) =>
  getApmErrorCountRuleData({ alert, rule }) || {};
