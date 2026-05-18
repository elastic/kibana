/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type {
  FlyoutInsightsRelatedReport,
  SeverityLevel,
} from '../../../../../../common/threat_intelligence/hub';
import { APP_UI_ID } from '../../../../../../common/constants';
import { THREAT_INTELLIGENCE_HUB_PATH } from '../../../../../threat_intelligence/constants/navigation';
import { useKibana } from '../../../../../common/lib/kibana';
import { useFlyoutInsights } from '../hooks/use_flyout_insights';
import { RELATED_THREAT_REPORTS_PANEL_TEST_ID } from './test_ids';

const SEVERITY_COLOR: Record<
  SeverityLevel,
  'success' | 'warning' | 'danger' | 'default'
> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const isBrowsableUrl = (url: string | undefined): url is string => {
  if (!url) {
    return false;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const joinReasonLabel = (reason: FlyoutInsightsRelatedReport['join_reason']): string => {
  if (reason === 'ioc_reference') {
    return i18n.translate(
      'xpack.securitySolution.flyout.threatIntelligence.relatedReports.joinIoc',
      { defaultMessage: 'IOC match' }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.flyout.threatIntelligence.relatedReports.joinTechnique',
    { defaultMessage: 'Technique overlap' }
  );
};

export interface RelatedThreatReportsPanelProps {
  hit: DataTableRecord;
}

export const RelatedThreatReportsPanel = memo(({ hit }: RelatedThreatReportsPanelProps) => {
  const { application } = useKibana().services;
  const { enabled, loading, error, data } = useFlyoutInsights({ hit });

  const navigateToHub = useCallback(
    (reportId: string) => {
      void application.navigateToApp(APP_UI_ID, {
        path: `${THREAT_INTELLIGENCE_HUB_PATH}?highlightReportId=${encodeURIComponent(reportId)}`,
      });
    },
    [application]
  );

  const columns = useMemo(
    (): Array<EuiBasicTableColumn<FlyoutInsightsRelatedReport>> => [
      {
        field: 'title',
        name: i18n.translate(
          'xpack.securitySolution.flyout.threatIntelligence.relatedReports.columnTitle',
          { defaultMessage: 'Report' }
        ),
        render: (title: string, report) => {
          const externalUrl = isBrowsableUrl(report.source.url) ? report.source.url : undefined;
          if (externalUrl) {
            return (
              <EuiLink href={externalUrl} target="_blank" external>
                {title}
              </EuiLink>
            );
          }
          return (
            <EuiButtonEmpty size="xs" onClick={() => navigateToHub(report.report_id)}>
              {title}
            </EuiButtonEmpty>
          );
        },
      },
      {
        field: 'severity',
        name: i18n.translate(
          'xpack.securitySolution.flyout.threatIntelligence.relatedReports.columnSeverity',
          { defaultMessage: 'Severity' }
        ),
        width: '100px',
        render: (severity: SeverityLevel) => (
          <EuiBadge color={SEVERITY_COLOR[severity]}>{severity}</EuiBadge>
        ),
      },
      {
        field: 'extracted_at',
        name: i18n.translate(
          'xpack.securitySolution.flyout.threatIntelligence.relatedReports.columnExtracted',
          { defaultMessage: 'Extracted' }
        ),
        width: '120px',
        render: (extractedAt: string) =>
          extractedAt ? <FormattedRelative value={new Date(extractedAt)} /> : '—',
      },
      {
        field: 'environment_hits_total',
        name: i18n.translate(
          'xpack.securitySolution.flyout.threatIntelligence.relatedReports.columnEnvHits',
          { defaultMessage: 'Env. hits' }
        ),
        width: '90px',
        render: (count: number) =>
          count > 0 ? <EuiBadge color="danger">{count}</EuiBadge> : <EuiText size="xs">0</EuiText>,
      },
      {
        field: 'join_reason',
        name: i18n.translate(
          'xpack.securitySolution.flyout.threatIntelligence.relatedReports.columnMatch',
          { defaultMessage: 'Match' }
        ),
        width: '140px',
        render: (reason: FlyoutInsightsRelatedReport['join_reason'], report) => {
          const label = joinReasonLabel(reason);
          if (report.matched_technique_ids && report.matched_technique_ids.length > 0) {
            return (
              <EuiToolTip content={report.matched_technique_ids.join(', ')}>
                <EuiBadge color="hollow">{label}</EuiBadge>
              </EuiToolTip>
            );
          }
          return <EuiBadge color="hollow">{label}</EuiBadge>;
        },
      },
    ],
    [navigateToHub]
  );

  if (!enabled) {
    return null;
  }

  const reports = data?.related_reports ?? [];

  return (
    <div data-test-subj={RELATED_THREAT_REPORTS_PANEL_TEST_ID}>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate(
            'xpack.securitySolution.flyout.threatIntelligence.relatedReports.sectionTitle',
            { defaultMessage: 'Related threat reports' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {loading ? (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.flyout.threatIntelligence.relatedReports.loading',
                { defaultMessage: 'Loading related threat reports…' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {error ? (
        <EuiCallOut title={error} color="danger" iconType="alert" size="s" />
      ) : null}

      {!loading && !error && reports.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.flyout.threatIntelligence.relatedReports.empty',
            { defaultMessage: 'No related threat reports found for this alert.' }
          )}
        </EuiText>
      ) : null}

      {!loading && !error && reports.length > 0 ? (
        <EuiBasicTable
          items={reports}
          columns={columns}
          tableLayout="auto"
          rowProps={(report) => ({
            'data-test-subj': `relatedThreatReportRow-${report.report_id}`,
          })}
        />
      ) : null}
    </div>
  );
});

RelatedThreatReportsPanel.displayName = 'RelatedThreatReportsPanel';
