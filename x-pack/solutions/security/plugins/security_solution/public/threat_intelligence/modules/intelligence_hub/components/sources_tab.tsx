/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiBadge,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { LIST_SOURCES_API_PATH } from '../../../../../common/threat_intelligence/hub';

const tagsCellCss = css({
  maxWidth: '100%',
  overflowWrap: 'anywhere',
});

export interface ThreatIntelSourceRow {
  source_id: string;
  name: string;
  adapter_type: string;
  enabled: boolean;
  url?: string;
  tags?: string[];
  updated_at?: string;
  created_at?: string;
}

interface ListSourcesResponse {
  total: number;
  sources: ThreatIntelSourceRow[];
}

interface SourcesTabProps {
  http: CoreStart['http'];
}

const SourcesTabComponent: React.FC<SourcesTabProps> = ({ http }) => {
  const [sources, setSources] = useState<ThreatIntelSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.post<ListSourcesResponse>(LIST_SOURCES_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({ size: 100 }),
        });
        if (!cancelled) {
          setSources(response.sources ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            (err as { body?: { message?: string }; message?: string }).body?.message ??
            (err as Error).message ??
            i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabUnknownError', {
              defaultMessage: 'Unknown error',
            });
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [http]);

  const columns = useMemo((): Array<EuiBasicTableColumn<ThreatIntelSourceRow>> => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
      },
      {
        field: 'adapter_type',
        name: i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabColumnType', {
          defaultMessage: 'Type',
        }),
        sortable: true,
      },
      {
        field: 'enabled',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabColumnEnabled',
          { defaultMessage: 'Enabled' }
        ),
        render: (enabled: ThreatIntelSourceRow['enabled']) =>
          enabled
            ? i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabEnabledYes', {
                defaultMessage: 'Yes',
              })
            : i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabEnabledNo', {
                defaultMessage: 'No',
              }),
      },
      {
        field: 'url',
        name: i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabColumnUrl', {
          defaultMessage: 'URL',
        }),
        render: (url: ThreatIntelSourceRow['url']) => <EuiText size="s">{url ?? '—'}</EuiText>,
      },
      {
        field: 'tags',
        name: i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabColumnTags', {
          defaultMessage: 'Tags',
        }),
        width: '28%',
        truncateText: false,
        render: (tags: ThreatIntelSourceRow['tags']) => {
          if (!tags?.length) {
            return '—';
          }
          return (
            <div css={tagsCellCss}>
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {tags.map((tag) => (
                  <EuiFlexItem grow={false} key={tag}>
                    <EuiBadge>{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          );
        },
      },
      {
        field: 'updated_at',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabColumnUpdated',
          { defaultMessage: 'Updated' }
        ),
        render: (updatedAt: ThreatIntelSourceRow['updated_at']) =>
          updatedAt ? <FormattedRelative value={new Date(updatedAt)} /> : '—',
      },
    ];
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex: 0,
      pageSize: 25,
      totalItemCount: sources.length,
      pageSizeOptions: [10, 25, 50, 100],
    }),
    [sources.length]
  );

  const onTableChange = useCallback(() => {}, []);

  if (loading) {
    return (
      <EuiEmptyPrompt
        data-test-subj="threatIntelSourcesTabLoading"
        icon={<EuiLoadingSpinner size="xl" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.sourcesTabLoadingTitle',
              {
                defaultMessage: 'Loading sources…',
              }
            )}
          </h2>
        }
      />
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="alert"
        title={i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabErrorTitle',
          {
            defaultMessage: 'Failed to load sources',
          }
        )}
        data-test-subj="threatIntelSourcesTabError"
      >
        {error}
      </EuiCallOut>
    );
  }

  if (sources.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="threatIntelSourcesTabEmpty"
        title={
          <h2>
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabEmptyTitle', {
              defaultMessage: 'No threat intelligence sources',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabEmptyBody', {
              defaultMessage:
                'Configured ingestion sources will appear here once the sources API is available.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <EuiInMemoryTable
      data-test-subj="threatIntelSourcesTabTable"
      items={sources}
      columns={columns}
      pagination={pagination}
      onTableChange={onTableChange}
      itemId="source_id"
    />
  );
};

export const SourcesTab = React.memo(SourcesTabComponent);
