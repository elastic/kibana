/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { buildQueryFromFilters, Filter } from '@kbn/es-query';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import {
  GetSLOResponse,
  apmTransactionDurationIndicatorSchema,
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
} from '@kbn/slo-schema';
import type { BurnRateAlert, BurnRateRule, TimeRange } from '../../../types';

type EmbeddableId =
  | 'APM_THROUGHPUT_CHART_EMBEDDABLE'
  | 'APM_LATENCY_CHART_EMBEDDABLE'
  | 'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE'
  | 'APM_ALERTING_LATENCY_CHART_EMBEDDABLE'
  | 'APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE';

export type APMTransactionDurationSLOResponse = GetSLOResponse & {
  indicator: APMTransactionDurationIndicator;
};

export type APMErrorRateSLOResponse = GetSLOResponse & {
  indicator: APMTransactionErrorRateIndicator;
};

interface APMEmbeddableRootProps {
  slo: APMTransactionDurationSLOResponse | APMErrorRateSLOResponse;
  dataTimeRange: TimeRange;
  embeddableId: EmbeddableId;
  alert: BurnRateAlert;
  rule: BurnRateRule;
}

export function APMEmbeddableRoot({
  slo,
  dataTimeRange,
  embeddableId,
  alert,
  rule,
}: APMEmbeddableRootProps) {
  const filter = slo.indicator.params.filter;
  const isKueryFilter = typeof filter === 'string';
  const groupingInput = getInputFromGroupings(slo);
  const indicator = slo.indicator;

  const kuery = isKueryFilter ? filter : undefined;
  const allFilters =
    !isKueryFilter && filter?.filters
      ? [...filter?.filters, ...groupingInput.filters]
      : groupingInput.filters;
  const filters = buildQueryFromFilters(allFilters, undefined, undefined);
  const groupingsInput = getInputFromGroupings(slo);
  const { transactionName, transactionType, environment, service } = indicator.params;
  const input = {
    id: uuidv4(),
    serviceName: service,
    transactionName: transactionName !== '*' ? transactionName : undefined,
    transactionType: transactionType !== '*' ? transactionType : undefined,
    environment: environment !== '*' ? environment : undefined,
    rangeFrom: dataTimeRange.from.toISOString(),
    rangeTo: dataTimeRange.to.toISOString(),
    latencyThresholdInMicroseconds: apmTransactionDurationIndicatorSchema.is(indicator)
      ? indicator.params.threshold * 1000
      : undefined,
    kuery,
    filters,
    alert,
    rule,
    comparisonEnabled: true,
    offset: '1d',
    ...groupingsInput.input,
  };

  if (!input.serviceName || !input.transactionType) {
    return null;
  }

  return (
    <ReactEmbeddableRenderer
      type={embeddableId}
      getParentApi={() => ({ getSerializedStateForChild: () => ({ rawState: input }) })}
      hidePanelChrome={true}
    />
  );
}

const getInputFromGroupings = (
  slo: APMTransactionDurationSLOResponse | APMErrorRateSLOResponse
) => {
  const groupings = Object.entries(slo.groupings) as Array<[string, string]>;
  const input: {
    transactionName?: string;
    transactionType?: string;
    serviceName?: string;
    environment?: string;
  } = {};
  const filters: Filter[] = [];
  groupings.forEach(([key, value]) => {
    switch (key) {
      case 'transaction.name':
        input.transactionName = value;
        break;
      case 'transaction.type':
        input.transactionType = value;
        break;
      case 'service.name':
        input.serviceName = value;
        break;
      case 'service.environment':
        input.environment = value;
        break;
      default:
        filters.push({
          meta: {
            type: 'custom',
            alias: null,
            key,
            params: {
              query: value,
            },
            disabled: false,
          },
          query: {
            match_phrase: {
              [key]: value,
            },
          },
        });
    }
  });

  return {
    input,
    filters,
  };
};
