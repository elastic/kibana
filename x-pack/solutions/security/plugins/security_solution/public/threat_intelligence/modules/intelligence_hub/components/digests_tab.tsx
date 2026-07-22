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
import { LIST_SUBSCRIPTIONS_API_PATH } from '../../../../../common/threat_intelligence/hub';

const tagsCellCss = css({
  maxWidth: '100%',
  overflowWrap: 'anywhere',
});

export interface DigestSubscriptionRow {
  subscription_id: string;
  schedule_rrule?: string;
  delivery?: { type: string; target: string };
  severity_threshold?: string;
  tags?: string[];
  human_summary?: string;
  created_at?: string;
  updated_at?: string;
}

interface ListSubscriptionsResponse {
  total: number;
  subscriptions: DigestSubscriptionRow[];
}

interface DigestsTabProps {
  http: CoreStart['http'];
}

const DigestsTabComponent: React.FC<DigestsTabProps> = ({ http }) => {
  const [subscriptions, setSubscriptions] = useState<DigestSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.post<ListSubscriptionsResponse>(LIST_SUBSCRIPTIONS_API_PATH, {
          version: '2023-10-31',
          body: JSON.stringify({ size: 50 }),
        });
        if (!cancelled) {
          setSubscriptions(response.subscriptions ?? []);
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
  }, [http]);

  const columns = useMemo((): Array<EuiBasicTableColumn<DigestSubscriptionRow>> => {
    return [
      {
        field: 'schedule_rrule',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnSchedule',
          { defaultMessage: 'Schedule' }
        ),
        render: (schedule: DigestSubscriptionRow['schedule_rrule']) =>
          schedule ??
          i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabScheduleUnset', {
            defaultMessage: '—',
          }),
      },
      {
        field: 'delivery',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnDelivery',
          { defaultMessage: 'Delivery' }
        ),
        render: (delivery: DigestSubscriptionRow['delivery']) => {
          if (!delivery) {
            return i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.digestsTabDeliveryUnset',
              { defaultMessage: '—' }
            );
          }
          return `${delivery.type}: ${delivery.target}`;
        },
      },
      {
        field: 'severity_threshold',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnSeverity',
          { defaultMessage: 'Severity' }
        ),
        render: (severity: DigestSubscriptionRow['severity_threshold']) =>
          severity ??
          i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabSeverityUnset', {
            defaultMessage: '—',
          }),
      },
      {
        field: 'tags',
        name: i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabColumnTags', {
          defaultMessage: 'Tags',
        }),
        width: '28%',
        truncateText: false,
        render: (tags: DigestSubscriptionRow['tags']) => {
          if (!tags?.length) {
            return i18n.translate(
              'xpack.securitySolution.threatIntelligence.app.digestsTabTagsEmpty',
              { defaultMessage: '—' }
            );
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
        field: 'human_summary',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnSummary',
          { defaultMessage: 'Summary' }
        ),
        render: (summary: DigestSubscriptionRow['human_summary']) => (
          <EuiText size="s">{summary ?? '—'}</EuiText>
        ),
      },
      {
        field: 'updated_at',
        name: i18n.translate(
          'xpack.securitySolution.threatIntelligence.app.digestsTabColumnUpdated',
          { defaultMessage: 'Updated' }
        ),
        render: (updatedAt: DigestSubscriptionRow['updated_at']) =>
          updatedAt ? <FormattedRelative value={new Date(updatedAt)} /> : '—',
      },
    ];
  }, []);

  const pagination = useMemo(
    () => ({
      pageIndex: 0,
      pageSize: 25,
      totalItemCount: subscriptions.length,
      pageSizeOptions: [10, 25, 50],
    }),
    [subscriptions.length]
  );

  const onTableChange = useCallback(() => {}, []);

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

  if (subscriptions.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="threatIntelDigestsTabEmpty"
        title={
          <h2>
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabEmptyTitle', {
              defaultMessage: 'No digests scheduled',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.securitySolution.threatIntelligence.app.digestsTabEmptyBody', {
              defaultMessage:
                'Use Schedule & deliver on the dashboard to create email or Slack digests for threat intelligence updates.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <EuiInMemoryTable
      data-test-subj="threatIntelDigestsTabTable"
      items={subscriptions}
      columns={columns}
      pagination={pagination}
      onTableChange={onTableChange}
      itemId="subscription_id"
    />
  );
};

export const DigestsTab = React.memo(DigestsTabComponent);
