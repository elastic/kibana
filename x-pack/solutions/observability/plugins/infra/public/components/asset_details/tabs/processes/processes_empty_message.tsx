/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiText, EuiLink, EuiButton } from '@elastic/eui';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';

interface ProcessesEmptyMessageProps {
  schema: DataSchemaFormat | null;
  clearSearchBar: () => void;
}

export const ProcessesEmptyMessage: React.FC<ProcessesEmptyMessageProps> = ({
  schema,
  clearSearchBar,
}) => {
  const effectiveSchema = schema ?? DEFAULT_SCHEMA;

  return (
    <EuiEmptyPrompt
      iconType="magnify"
      titleSize="s"
      title={
        <strong>
          <FormattedMessage
            id="xpack.infra.metrics.nodeDetails.noProcesses"
            defaultMessage="No processes found"
          />
        </strong>
      }
      body={
        <EuiText size="s">
          {effectiveSchema === 'ecs' ? (
            <FormattedMessage
              id="xpack.infra.metrics.nodeDetails.noProcessesBody.ecs"
              defaultMessage="Try modifying your filter. Only processes that are within the configured {metricbeatDocsLink} will display here."
              values={{
                metricbeatDocsLink: (
                  <EuiLink
                    data-test-subj="infraProcessesTableTopNByCpuOrMemoryLink"
                    href="https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-module-system.html"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.metrics.nodeDetails.noProcessesBody.metricbeatDocsLinkText"
                      defaultMessage="top N by CPU or Memory"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.infra.metrics.nodeDetails.noProcessesBody.semconv"
              defaultMessage="Try modifying your filter and ensure that you have configured your {otelDocsLink} correctly to emit process data."
              values={{
                otelDocsLink: (
                  <EuiLink
                    data-test-subj="infraProcessesTableOtelDocsLink"
                    href="https://ela.st/otel-process-hosts-ui"
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.metrics.nodeDetails.noProcessesBody.otelDocsLinkText"
                      defaultMessage="OTel Collector"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
        </EuiText>
      }
      actions={
        <EuiButton data-test-subj="infraProcessesTableClearFiltersButton" onClick={clearSearchBar}>
          <FormattedMessage
            id="xpack.infra.metrics.nodeDetails.noProcessesClearFilters"
            defaultMessage="Clear filters"
          />
        </EuiButton>
      }
    />
  );
};
