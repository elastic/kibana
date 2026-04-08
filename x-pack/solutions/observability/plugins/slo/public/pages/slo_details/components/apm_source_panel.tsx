/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';

const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

const APM_SOURCE_FIELDS = {
  SERVICE_NAME: 'service.name',
  SERVICE_ENVIRONMENT: 'service.environment',
  TRANSACTION_TYPE: 'transaction.type',
  TRANSACTION_NAME: 'transaction.name',
} as const;

type ApmSourceField = (typeof APM_SOURCE_FIELDS)[keyof typeof APM_SOURCE_FIELDS];

type ApmIndicator = APMTransactionDurationIndicator | APMTransactionErrorRateIndicator;

interface ApmSourcePanelProps {
  slo: SLOWithSummaryResponse;
  timeRange?: { from: string; to: string };
}

export function ApmSourcePanel({ slo, timeRange }: ApmSourcePanelProps) {
  const {
    services: {
      application: { capabilities },
      share,
    },
  } = useKibana();

  const indicator = slo.indicator as ApmIndicator;

  const {
    params: { service, environment, transactionType, transactionName },
  } = indicator;

  const serviceNameValue = (slo.groupings?.['service.name'] as string | undefined) ?? service;
  const envValue = (slo.groupings?.['service.environment'] as string | undefined) ?? environment;
  const transactionTypeValue =
    (slo.groupings?.['transaction.type'] as string | undefined) ?? transactionType;
  const transactionNameValue =
    (slo.groupings?.['transaction.name'] as string | undefined) ?? transactionName;

  const defaultTimeRange = { from: `now-${slo.timeWindow.duration}`, to: 'now' };
  const effectiveTimeRange = timeRange ?? defaultTimeRange;

  const hasApmReadCapabilities = !!capabilities.apm.show;
  const isRemote = !!slo.remote;
  const canNavigateToApm = hasApmReadCapabilities && !isRemote;

  const locator = canNavigateToApm ? share.url.locators.get(APM_APP_LOCATOR_ID) : undefined;

  const getFieldLink = (field: ApmSourceField, value: string): string | undefined => {
    if (!locator || serviceNameValue === ALL_VALUE) return undefined;

    const base = {
      serviceName: serviceNameValue,
      query: {
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: effectiveTimeRange.from,
        rangeTo: effectiveTimeRange.to,
      },
    };

    switch (field) {
      case APM_SOURCE_FIELDS.SERVICE_ENVIRONMENT:
        return locator.getRedirectUrl({ ...base, query: { ...base.query, environment: value } });
      case APM_SOURCE_FIELDS.TRANSACTION_TYPE:
        return locator.getRedirectUrl({
          ...base,
          query: { ...base.query, transactionType: value },
        });
      case APM_SOURCE_FIELDS.TRANSACTION_NAME:
        return locator.getRedirectUrl({
          ...base,
          serviceOverviewTab: 'transactions',
          query: { ...base.query, transactionName: value },
        });
      case APM_SOURCE_FIELDS.SERVICE_NAME:
      default:
        return locator.getRedirectUrl(base);
    }
  };

  const fields: Array<{ field: ApmSourceField; value: string }> = [
    { field: APM_SOURCE_FIELDS.SERVICE_NAME, value: serviceNameValue },
    { field: APM_SOURCE_FIELDS.SERVICE_ENVIRONMENT, value: envValue },
    { field: APM_SOURCE_FIELDS.TRANSACTION_TYPE, value: transactionTypeValue },
    { field: APM_SOURCE_FIELDS.TRANSACTION_NAME, value: transactionNameValue },
  ];

  const visibleFields = fields.filter((f) => f.value !== ALL_VALUE);

  if (visibleFields.length === 0) return null;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={true}
      data-test-subj="sloDetailsApmSourcePanel"
      paddingSize="m"
    >
      <EuiFlexGroup gutterSize="l" direction="row" wrap alignItems="center">
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.slo.sloDetails.apmSourcePanel.title', {
              defaultMessage: 'Source',
            })}
          </h3>
        </EuiTitle>
        {visibleFields.map(({ field, value }) => {
          const link = getFieldLink(field, value);
          return (
            <EuiText key={field} size="s">
              {field}:{' '}
              {link ? (
                <EuiLink
                  data-test-subj={`sloDetailsApmSourceLink-${field}`}
                  data-action="navigateToApm"
                  data-source={slo.indicator.type}
                  href={link}
                >
                  {value}
                </EuiLink>
              ) : (
                <strong>{value}</strong>
              )}
            </EuiText>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
