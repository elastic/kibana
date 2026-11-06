/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiInMemoryTable, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { HttpRequestGroup } from '../../../../common/types/network';
import { useFormatters } from '../../../hooks/use_formatters';
import { formatDurationMs } from '../../../utils/format_duration';
import { badgeColumnPreset, metricColumnPreset } from '../../../utils/column_presets';
import { DataPanel } from '../../../components/data_panel';
import { TruncatedUrl } from '../../../components/truncated_url';

const TITLE = i18n.translate('xpack.digitalExperience.network.httpRequests.title', {
  defaultMessage: 'HTTP requests',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.network.httpRequests.subtitle', {
  defaultMessage:
    'The fetch and XHR calls made the most. A failure is an error status or no response.',
});

const METHOD_LABEL = i18n.translate('xpack.digitalExperience.network.httpRequests.method', {
  defaultMessage: 'Method',
});

const URL_LABEL = i18n.translate('xpack.digitalExperience.network.httpRequests.url', {
  defaultMessage: 'URL',
});

const REQUESTS_LABEL = i18n.translate('xpack.digitalExperience.network.httpRequests.requests', {
  defaultMessage: 'Requests',
});

const P95_LABEL = i18n.translate('xpack.digitalExperience.network.httpRequests.p95', {
  defaultMessage: 'Duration (p95)',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.network.httpRequests.empty', {
  defaultMessage: 'No fetch or XHR requests in this time range.',
});

const FAILED_LABEL = i18n.translate('xpack.digitalExperience.network.httpRequests.failed', {
  defaultMessage: 'Failed',
});

/** The requests the browser made the most, by method and URL, with their duration and failures. */
export function HttpRequestsPanel({
  requests,
  isLoading,
}: {
  requests: HttpRequestGroup[];
  isLoading: boolean;
}) {
  const { formatNumber, formatPercent } = useFormatters();

  const columns: Array<EuiBasicTableColumn<HttpRequestGroup>> = [
    {
      field: 'method',
      name: METHOD_LABEL,
      ...badgeColumnPreset<HttpRequestGroup>(),
      render: (method: string) => {
        return <EuiBadge color="hollow">{method}</EuiBadge>;
      },
    },
    {
      field: 'url',
      name: URL_LABEL,
      render: (url: string) => {
        return <TruncatedUrl url={url} />;
      },
    },
    {
      field: 'count',
      name: REQUESTS_LABEL,
      sortable: true,
      ...metricColumnPreset<HttpRequestGroup>(),
      render: (count: number) => {
        return formatNumber(count);
      },
    },
    {
      field: 'p95Ms',
      name: P95_LABEL,
      sortable: true,
      ...metricColumnPreset<HttpRequestGroup>(),
      render: (p95Ms: number | null) => {
        return p95Ms === null ? <EmptyCellValue /> : formatDurationMs(p95Ms);
      },
    },
    {
      field: 'failedRatio',
      name: FAILED_LABEL,
      sortable: true,
      ...metricColumnPreset<HttpRequestGroup>(),
      render: (failedRatio: number | null, { failedCount }) => {
        if (failedRatio === null) {
          return <EmptyCellValue />;
        }
        return (
          <EuiText
            size="s"
            color={failedCount > 0 ? 'danger' : 'subdued'}
            data-test-subj="digitalExperienceNetworkHttpFailed"
          >
            {`${formatPercent(failedRatio)} (${formatNumber(failedCount)})`}
          </EuiText>
        );
      },
    },
  ];

  return (
    <DataPanel
      title={TITLE}
      subtitle={SUBTITLE}
      isLoading={isLoading}
      isEmpty={requests.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      showInstrumentationDocs
      data-test-subj="digitalExperienceNetworkHttpRequests"
    >
      <EuiInMemoryTable<HttpRequestGroup>
        tableCaption={TITLE}
        items={requests}
        columns={columns}
        rowHeader="url"
        sorting={{ sort: { field: 'count', direction: 'desc' } }}
      />
    </DataPanel>
  );
}
