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
  EuiSpacer,
  EuiSwitch,
  EuiText,
  type Criteria,
  type EuiBasicTableColumn,
  type Pagination,
} from '@elastic/eui';
import {
  LIST_SOURCES_API_PATH,
  resolveTimeRangeFromPreset,
  type TimeRangePresetId,
} from '../../../../../common/threat_intelligence/hub';

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
  report_count: number;
  last_ingested_at?: string;
  env_hits_total: number;
}

interface ListSourcesResponse {
  total: number;
  sources: ThreatIntelSourceRow[];
}

interface SourcesTabProps {
  http: CoreStart['http'];
  timeRangePreset: TimeRangePresetId;
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SourcesTabComponent: React.FC<SourcesTabProps> = ({ http, timeRangePreset }) => {
  const [sources, setSources] = useState<ThreatIntelSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
      try {
        const response = await http.post<ListSourcesResponse>(LIST_SOURCES_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({
            size: 500,
            time_range: { from, to },
          }),
        });
        if (!cancelled) {
          setSources(
            (response.sources ?? []).map((source) => ({
              ...source,
              name: source.name ?? source.source_id,
              adapter_type: source.adapter_type ?? '—',
              enabled: Boolean(source.enabled),
              report_count: source.report_count ?? 0,
              env_hits_total: source.env_hits_total ?? 0,
            }))
          );
          setPageIndex(0);
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
  }, [http, timeRangePreset]);

  const visibleSources = useMemo(() => {
    const filtered = showDisabled
      ? sources
      : sources.filter(
          (source) => source.enabled || source.report_count > 0 || source.env_hits_total > 0
        );

    return [...filtered].sort((a, b) => {
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1;
      }
      if (b.report_count !== a.report_count) {
        return b.report_count - a.report_count;
      }
      if (b.env_hits_total !== a.env_hits_total) {
        return b.env_hits_total - a.env_hits_total;
      }
      return a.name.localeCompare(b.name);
    });
  }, [showDisabled, sources]);

  useEffect(() => {
    setPageIndex(0);
  }, [showDisabled, visibleSources.length]);

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
        width: '12%',
      },
      {
        field: 'enabled',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabColumnEnabled',
          { defaultMessage: 'Enabled' }
        ),
        sortable: true,
        width: '8%',
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
        field: 'report_count',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabColumnReports',
          { defaultMessage: 'Reports' }
        ),
        sortable: true,
        width: '8%',
      },
      {
        field: 'env_hits_total',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabColumnEnvHits',
          { defaultMessage: 'Env hits' }
        ),
        sortable: true,
        width: '8%',
        render: (envHits: ThreatIntelSourceRow['env_hits_total']) =>
          envHits > 0 ? (
            <EuiBadge color="danger" data-test-subj="threatIntelSourcesTabEnvHits">
              {envHits}
            </EuiBadge>
          ) : (
            '0'
          ),
      },
      {
        field: 'last_ingested_at',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.sourcesTabColumnLastIngested',
          { defaultMessage: 'Last ingested' }
        ),
        sortable: true,
        width: '12%',
        render: (lastIngested: ThreatIntelSourceRow['last_ingested_at']) =>
          lastIngested ? <FormattedRelative value={new Date(lastIngested)} /> : '—',
      },
      {
        field: 'tags',
        name: i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabColumnTags', {
          defaultMessage: 'Tags',
        }),
        width: '22%',
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
    ];
  }, []);

  const pagination = useMemo(
    (): Pagination => ({
      pageIndex,
      pageSize,
      totalItemCount: visibleSources.length,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [pageIndex, pageSize, visibleSources.length]
  );

  const onTableChange = useCallback((criteria: Criteria<ThreatIntelSourceRow>) => {
    if (criteria.page) {
      setPageIndex(criteria.page.index);
      setPageSize(criteria.page.size);
    }
  }, []);

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
                'Configured ingestion sources will appear here once the sources catalog is seeded. Restart Kibana after wiping Elasticsearch, or generate demo sources with yarn data:generate --threat-intel.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="threatIntelSourcesTabSummary">
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.sourcesTabSummary', {
              defaultMessage:
                'Showing {visible} of {total} sources. Report counts and env hits come from ingested threat reports.',
              values: { visible: visibleSources.length, total: sources.length },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.sourcesTabShowDisabled',
              { defaultMessage: 'Show disabled catalog sources' }
            )}
            checked={showDisabled}
            onChange={(event) => setShowDisabled(event.target.checked)}
            data-test-subj="threatIntelSourcesTabShowDisabled"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {visibleSources.length === 0 ? (
        <EuiEmptyPrompt
          data-test-subj="threatIntelSourcesTabFilteredEmpty"
          title={
            <h2>
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.sourcesTabFilteredEmptyTitle',
                { defaultMessage: 'No active sources yet' }
              )}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.sourcesTabFilteredEmptyBody',
                {
                  defaultMessage: 'Enabled sources and sources with ingested reports appear here.',
                }
              )}
            </p>
          }
        />
      ) : (
        <EuiInMemoryTable
          data-test-subj="threatIntelSourcesTabTable"
          tableCaption={i18n.translate(
            'xpack.securitySolution.threatIntelligence.app.sourcesTabTableCaption',
            { defaultMessage: 'Threat intelligence sources' }
          )}
          items={visibleSources}
          columns={columns}
          pagination={pagination}
          onTableChange={onTableChange}
          sorting={true}
          itemId="source_id"
        />
      )}
    </>
  );
};

export const SourcesTab = React.memo(SourcesTabComponent);
