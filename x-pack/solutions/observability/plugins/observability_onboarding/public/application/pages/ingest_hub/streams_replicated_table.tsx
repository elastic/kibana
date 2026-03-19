/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldSearch,
  EuiBasicTable,
  EuiLink,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiLoadingElastic,
  useEuiTheme,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface StreamRow {
  name: string;
}

const PAGE_SIZE = 25;

export const StreamsReplicatedTable: React.FC = () => {
  const { services } = useKibana();
  const { euiTheme } = useEuiTheme();
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const fetchStreams = useCallback(async (signal?: AbortSignal) => {
    const client = services.streams?.streamsRepositoryClient;
    if (!client) {
      setStreams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await client.fetch('GET /internal/streams', { signal: signal ?? null });
      setStreams((result.streams ?? []).map((s: { stream: { name: string } }) => ({ name: s.stream.name })));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStreams([]);
      }
    } finally {
      setLoading(false);
    }
  }, [services.streams?.streamsRepositoryClient]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStreams(controller.signal);
    return () => controller.abort();
  }, [fetchStreams]);

  const navigateToStream = (name: string) => {
    services.application?.navigateToApp?.('streams', { path: `#/${encodeURIComponent(name)}` });
  };

  const filteredStreams = search.trim()
    ? streams.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()))
    : streams;

  const pageStart = pagination.pageIndex * pagination.pageSize;
  const pageEnd = pageStart + pagination.pageSize;
  const pageOfItems = filteredStreams.slice(pageStart, pageEnd);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      render: (name: string) => (
        <EuiLink onClick={() => navigateToStream(name)} data-test-subj={`streamsNameLink-${name}`}>
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'documents',
      name: i18n.translate('xpack.streams.streamsTreeTable.documentsColumnName', {
        defaultMessage: 'Documents',
      }),
      render: () => '—',
    },
    {
      field: 'dataQuality',
      name: i18n.translate('xpack.streams.streamsTreeTable.dataQualityColumnName', {
        defaultMessage: 'Data Quality',
      }),
      render: () => (
        <EuiBadge color="success">
          {i18n.translate('xpack.streams.dataQuality.good', { defaultMessage: 'Good' })}
        </EuiBadge>
      ),
    },
    {
      field: 'retention',
      name: i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
        defaultMessage: 'Retention',
      }),
      render: () => (
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => services.application?.navigateToApp?.('streams')}>
              logs
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">ILM</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('xpack.streams.streamsTreeTable.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.openInStreams', {
            defaultMessage: 'Open in Streams',
          }),
          description: i18n.translate(
            'xpack.observabilityOnboarding.ingestHub.streams.openInStreamsAria',
            { defaultMessage: 'Open this stream in the Streams app' }
          ),
          icon: 'compass',
          type: 'icon',
          onClick: ({ name }: StreamRow) => navigateToStream(name),
        },
      ],
    },
  ];

  const onTableChange = ({ page }: CriteriaWithPagination<StreamRow>) => {
    if (page) {
      setPagination({ pageIndex: page.index, pageSize: page.size });
    }
  };

  if (!services.streams?.streamsRepositoryClient) {
    return (
      <EuiEmptyPrompt
        iconType="database"
        title={
          <h3>
            {i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.openStreamsToView', {
              defaultMessage: 'Open Streams to view your data streams',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.observabilityOnboarding.ingestHub.streams.openStreamsToViewDescription',
              {
                defaultMessage:
                  'The Streams app lists your data streams with document counts, data quality, and retention.',
              }
            )}
          </p>
        }
        actions={
          <EuiButton fill onClick={() => services.application?.navigateToApp?.('streams')}>
            {i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.openStreamsButton', {
              defaultMessage: 'Open Streams',
            })}
          </EuiButton>
        }
      />
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h3>
            {i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.tableErrorTitle', {
              defaultMessage: 'Failed to load streams',
            })}
          </h3>
        }
        body={<p>{error.message}</p>}
        actions={
          <EuiButton fill onClick={() => fetchStreams()}>
            {i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.retryButton', {
              defaultMessage: 'Try again',
            })}
          </EuiButton>
        }
      />
    );
  }

  if (loading && streams.length === 0) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingElastic size="xl" />}
        title={
          <h2>
            {i18n.translate('xpack.streams.streamsListView.loadingStreams', {
              defaultMessage: 'Loading Streams',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" css={{ marginBottom: euiTheme.size.m }}>
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.searchPlaceholder', {
              defaultMessage: 'Search...',
            })}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            fullWidth
            aria-label={i18n.translate('xpack.streams.streamsTreeTable.searchAriaLabel', {
              defaultMessage: 'Search streams',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            aria-label={i18n.translate('xpack.observabilityOnboarding.ingestHub.streams.refreshAria', {
              defaultMessage: 'Refresh',
            })}
            onClick={() => fetchStreams()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiBasicTable<StreamRow>
        loading={loading}
        items={pageOfItems}
        columns={columns}
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          totalItemCount: filteredStreams.length,
          pageSizeOptions: [10, 25, 50],
          showPerPageOptions: true,
        }}
        onChange={onTableChange}
        data-test-subj="streamsTable"
        css={css`
          .euiTableCaption {
            border: 1px solid ${euiTheme.border.color};
            border-radius: ${euiTheme.border.radius.medium};
          }
        `}
      />
    </>
  );
};
