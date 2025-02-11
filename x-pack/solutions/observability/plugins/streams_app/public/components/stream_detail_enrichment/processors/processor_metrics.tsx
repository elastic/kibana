/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ProcessorMetrics } from '../hooks/use_processing_simulator';

type ProcessorMetricBadgesProps = ProcessorMetrics;

const formatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export const ProcessorMetricBadges = ({
  detected_fields,
  failure_rate,
  success_rate,
}: ProcessorMetricBadgesProps) => {
  const detectedFieldsCount = detected_fields.length;
  const failureRate = failure_rate > 0 ? formatter.format(failure_rate) : null;
  const successRate = success_rate > 0 ? formatter.format(success_rate) : null;

  return (
    <EuiBadgeGroup gutterSize="xs">
      {failureRate && (
        <EuiBadge color="hollow" iconType="warning">
          {failureRate}
        </EuiBadge>
      )}
      {successRate && (
        <EuiBadge color="hollow" iconType="check">
          {successRate}
        </EuiBadge>
      )}
      {detectedFieldsCount > 0 && (
        <EuiBadge color="hollow">
          {i18n.translate('xpack.streams.processorMetricBadges.FieldsBadgeLabel', {
            defaultMessage: '{detectedFieldsCount} fields',
            values: { detectedFieldsCount },
          })}
        </EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};
