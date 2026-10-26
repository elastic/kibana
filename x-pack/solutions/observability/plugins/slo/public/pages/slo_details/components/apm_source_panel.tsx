/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import {
  APM_SOURCE_FIELDS,
  getApmSourceFieldLink,
  getResolvedApmParams,
} from '../../../utils/slo/get_apm_source_field_link';

const APM_APP_LOCATOR_ID = 'APM_LOCATOR';
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

  const defaultTimeRange = { from: `now-${slo.timeWindow.duration}`, to: 'now' };
  const effectiveTimeRange = timeRange ?? defaultTimeRange;

  const resolvedApmParams = getResolvedApmParams(slo);

  const fields = [
    { field: APM_SOURCE_FIELDS.SERVICE_NAME, value: resolvedApmParams.serviceName },
    { field: APM_SOURCE_FIELDS.SERVICE_ENVIRONMENT, value: resolvedApmParams.environment },
    { field: APM_SOURCE_FIELDS.TRANSACTION_TYPE, value: resolvedApmParams.transactionType },
    { field: APM_SOURCE_FIELDS.TRANSACTION_NAME, value: resolvedApmParams.transactionName },
  ];

  const visibleFields = fields.filter((f) => f.value !== ALL_VALUE);

  if (visibleFields.length === 0) return null;

  const hasApmReadCapabilities = !!capabilities.apm?.show;
  const isRemote = !!slo.remote;

  const canNavigateToApm = hasApmReadCapabilities && !isRemote;

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
          const link = canNavigateToApm
            ? getApmSourceFieldLink({
                apmLocator: share.url.locators.get(APM_APP_LOCATOR_ID),
                serviceName: resolvedApmParams.serviceName,
                timeRange: effectiveTimeRange,
                field,
                value,
              })
            : undefined;

          return (
            <EuiText key={field} size="s">
              {field}:{' '}
              {link ? (
                <EuiLink
                  data-test-subj={`sloDetailsApmSourceLink-${field}`}
                  data-action="navigateToApmSource"
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
