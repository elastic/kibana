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

type APMIndicator = APMTransactionDurationIndicator | APMTransactionErrorRateIndicator;

const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

interface ApmSourcePanelProps {
  slo: SLOWithSummaryResponse;
  timeRange?: { from: string; to: string };
}

export function ApmSourcePanel({ slo, timeRange }: ApmSourcePanelProps) {
  const {
    application: { capabilities },
    share,
  } = useKibana().services;

  const indicator = slo.indicator as APMIndicator;

  const {
    params: { service, environment, transactionType, transactionName },
  } = indicator;

  const hasApmReadCapabilities = !!capabilities.apm.show;
  const isRemote = !!slo.remote;

  const serviceName = String(slo.groupings?.['service.name'] ?? service);
  const envValue = String(slo.groupings?.['service.environment'] ?? environment);
  const transactionTypeValue = String(slo.groupings?.['transaction.type'] ?? transactionType);
  const transactionNameValue = String(slo.groupings?.['transaction.name'] ?? transactionName);

  const defaultTimeRange = { from: `now-${slo.timeWindow.duration}`, to: 'now' };
  const effectiveTimeRange = timeRange ?? defaultTimeRange;

  const canNavigateToApm = hasApmReadCapabilities && !isRemote;

  const locator = canNavigateToApm ? share.url.locators.get(APM_APP_LOCATOR_ID) : undefined;

  const getFieldLink = (field: string, value: string): string | undefined => {
    if (!locator || serviceName === ALL_VALUE) return undefined;

    const base = {
      serviceName,
      query: {
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: effectiveTimeRange.from,
        rangeTo: effectiveTimeRange.to,
      },
    };

    switch (field) {
      case 'service.environment':
        return locator.getRedirectUrl({ ...base, query: { ...base.query, environment: value } });
      case 'transaction.type':
        return locator.getRedirectUrl({
          ...base,
          query: { ...base.query, transactionType: value },
        });
      case 'transaction.name':
        return locator.getRedirectUrl({
          ...base,
          serviceOverviewTab: 'transactions',
          query: { ...base.query, transactionName: value },
        });
      default:
        return locator.getRedirectUrl(base);
    }
  };

  const fields = [
    { field: 'service.name', label: 'service.name', value: serviceName },
    { field: 'service.environment', label: 'service.environment', value: envValue },
    { field: 'transaction.type', label: 'transaction.type', value: transactionTypeValue },
    { field: 'transaction.name', label: 'transaction.name', value: transactionNameValue },
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
        {visibleFields.map((field) => {
          const link = getFieldLink(field.field, field.value);
          return (
            <EuiText key={field.field} size="s">
              {field.label}:{' '}
              {link ? (
                <EuiLink data-test-subj={`sloDetailsApmSourceLink-${field.field}`} href={link}>
                  {field.value}
                </EuiLink>
              ) : (
                <strong>{field.value}</strong>
              )}
            </EuiText>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
