/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HostMetricsDocsLink } from './host_metrics_docs_link';

export const HostMetricsExplanationContent = () => {
  return (
    <EuiText size="xs">
      <p>
        <FormattedMessage
          id="xpack.infra.hostsViewPage.metricsExplanation"
          defaultMessage="Showing metrics for your host(s)"
        />
      </p>
      <p>
        <HostMetricsDocsLink type="metrics" />
      </p>
      <p>
        <HostMetricsDocsLink type="dottedLines" />
      </p>
    </EuiText>
  );
};
