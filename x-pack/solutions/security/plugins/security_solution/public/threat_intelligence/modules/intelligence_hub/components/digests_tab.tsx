/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiBadge,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiText,
  type Criteria,
  type EuiBasicTableColumn,
  type Pagination,
} from '@elastic/eui';
import {
  LIST_DIGESTS_API_PATH,
  resolveTimeRangeFromPreset,
  type TimeRangePresetId,
} from '../../../../../common/threat_intelligence/hub';

export interface DigestDeliveryRow {
  digest_id: string;
  '@timestamp': string;
  subscription_id: string;
  time_range?: { from?: string; to?: string };
  report_count: number;
  delivered?: boolean;
  delivery_error?: string;
  advisory_id?: string;
}

interface ListDigestsResponse {
  total: number;
  digests: DigestDeliveryRow[];
}

interface DigestsTabProps {
  http: CoreStart['http'];
  timeRangePreset: TimeRangePresetId;
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const DigestsTabComponent: React.FC<DigestsTabProps> = ({ http, timeRangePreset }) => {
  const [digests, setDigests] = useState<DigestDeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { from, to } = resolveTimeRangeFromPreset(timeRangePreset);
      try {
        const response = await http.post<ListDigestsResponse>(LIST_DIGESTS_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({
            size: 100,
            time_range: { from, to },
          }),
        });
        if (!cancelled) {
          setDigests(response.digests ?? []);
          setPageIndex(0);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            (err as { body?: { message?: string }; message?: string }).body?.message ??
            (err as Error).message ??
            i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabUnknownError', {
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

  const columns = useMemo((): Array<EuiBasicTableColumn<DigestDeliveryRow>> => {
    return [
      {
        field: '@timestamp',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnGenerated',
          { defaultMessage: 'Generated' }
        ),
        render: (timestamp: string) =>
          timestamp ? <FormattedRelative value={new Date(timestamp)} /> : '—',
      },
      {
        field: 'subscription_id',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnSubscription',
          { defaultMessage: 'Subscription' }
        ),
      },
      {
        field: 'time_range',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnPeriod',
          { defaultMessage: 'Period covered' }
        ),
        render: (range: DigestDeliveryRow['time_range']) => {
          if (!range?.from || !range?.to) {
            return '—';
          }
          return (
            <EuiText size="xs">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.digestsTabPeriodRange',
                {
                  defaultMessage: '{fromDate} – {toDate}',
                  values: {
                    fromDate: new Date(range.from).toLocaleDateString(),
                    toDate: new Date(range.to).toLocaleDateString(),
                  },
                }
              )}
            </EuiText>
          );
        },
      },
      {
        field: 'report_count',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnReports',
          { defaultMessage: 'Reports' }
        ),
      },
      {
        field: 'delivered',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnStatus',
          { defaultMessage: 'Status' }
        ),
        render: (_delivered: boolean | undefined, row: DigestDeliveryRow) => {
          if (row.delivery_error) {
            return (
              <EuiBadge color="danger">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.digestsTabStatusFailed',
                  { defaultMessage: 'Failed' }
                )}
              </EuiBadge>
            );
          }
          if (row.delivered) {
            return (
              <EuiBadge color="success">
                {i18n.translate(
                  'xpack.securitySolution.threatIntelligence.app.digestsTabStatusDelivered',
                  { defaultMessage: 'Delivered' }
                )}
              </EuiBadge>
            );
          }
          return (
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.app.digestsTabStatusPending',
                { defaultMessage: 'Pending' }
              )}
            </EuiBadge>
          );
        },
      },
    ];
  }, []);

  const pagination = useMemo(
    (): Pagination => ({
      pageIndex,
      pageSize,
      totalItemCount: digests.length,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    }),
    [digests.length, pageIndex, pageSize]
  );

  const onTableChange = useCallback((criteria: Criteria<DigestDeliveryRow>) => {
    if (criteria.page) {
      setPageIndex(criteria.page.index);
      setPageSize(criteria.page.size);
    }
  }, []);

  if (loading) {
    return (
      <EuiEmptyPrompt
        data-test-subj="threatIntelDigestsTabLoading"
        icon={<EuiLoadingSpinner size="xl" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.digestsTabLoadingTitle',
              {
                defaultMessage: 'Loading digests…',
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
          'xpack.securitySolution.threatIntelligence.app.digestsTabErrorTitle',
          {
            defaultMessage: 'Failed to load digests',
          }
        )}
        data-test-subj="threatIntelDigestsTabError"
      >
        {error}
      </EuiCallOut>
    );
  }

  if (digests.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="threatIntelDigestsTabEmpty"
        title={
          <h2>
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabEmptyTitle', {
              defaultMessage: 'No digests in this time range',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabEmptyBody', {
              defaultMessage:
                'No digests were generated in the selected Hub time range. Use Schedule & deliver to create digest subscriptions, or widen the time range.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <EuiInMemoryTable
      data-test-subj="threatIntelDigestsTabTable"
      tableCaption={i18n.translate(
        'xpack.securitySolution.threatIntelligence.app.digestsTabTableCaption',
        { defaultMessage: 'Delivered digests' }
      )}
      items={digests}
      columns={columns}
      pagination={pagination}
      onTableChange={onTableChange}
      itemId="digest_id"
    />
  );
};

export const DigestsTab = React.memo(DigestsTabComponent);
