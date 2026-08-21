/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import {
  DASHBOARD_OVERVIEW_API_PATH,
  resolveOverviewQueryFromScope,
  type DashboardOverviewResponse,
  type ReportTablePayload,
  type SeverityLevel,
  type ThreatCategory,
} from '../../../../common/threat_intelligence/hub';
import { useKibana } from '../../../common/lib/kibana';
import {
  IntelligenceHubDashboardView,
  type IntelligenceHubChipFilters,
} from '../../../threat_intelligence/modules/intelligence_hub/components/intelligence_hub_dashboard';
import type { ReportFeedSort } from '../../../threat_intelligence/components/report_feed';

type ReportTableAttachment = Attachment<'threat-intel-report-table', ReportTablePayload>;

const buildInitialChipFilters = (
  scope: ReportTablePayload['scope']
): IntelligenceHubChipFilters => ({
  regions: scope?.regions ?? [],
  categories: scope?.categories ?? [],
  severities: [],
});

export const ReportTableCanvasContent: React.FC<AttachmentRenderProps<ReportTableAttachment>> = ({
  attachment,
}) => {
  const { http } = useKibana().services;
  const { scope, time_range_label: rangeLabel, attachmentLabel } = attachment.data;
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<IntelligenceHubChipFilters>(() =>
    buildInitialChipFilters(scope)
  );
  const [sortBy, setSortBy] = useState<ReportFeedSort>('relevance');
  const [highlightReportId, setHighlightReportId] = useState<string | undefined>();

  const overviewQuery = useMemo(() => resolveOverviewQueryFromScope(scope), [scope]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get<DashboardOverviewResponse>(DASHBOARD_OVERVIEW_API_PATH, {
        version: '2023-10-31',
        query: {
          from: overviewQuery.from,
          to: overviewQuery.to,
          ...(overviewQuery.regions.length ? { regions: overviewQuery.regions } : {}),
          ...(overviewQuery.categories.length ? { categories: overviewQuery.categories } : {}),
        },
      });
      setData(response);
    } catch (err) {
      setError(
        (err as { body?: { message?: string }; message?: string }).body?.message ??
          (err as Error).message ??
          'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  }, [http, overviewQuery]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const toggleSeverity = useCallback((severity: SeverityLevel) => {
    setFilters((prev) => ({
      ...prev,
      severities: prev.severities.includes(severity)
        ? prev.severities.filter((s) => s !== severity)
        : [...prev.severities, severity],
    }));
  }, []);

  const toggleCategory = useCallback((category: ThreatCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const clearChipFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, severities: [], categories: [] }));
  }, []);

  const title =
    attachmentLabel ??
    i18n.translate(
      'xpack.securitySolution.threatIntelligence.attachments.reportTable.canvasTitle',
      { defaultMessage: 'Intelligence Hub' }
    );

  if (loading && !data) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.reportTable.canvasLoading',
              { defaultMessage: 'Loading intelligence overview…' }
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
        title={i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.reportTable.canvasErrorTitle',
          { defaultMessage: 'Failed to load Intelligence Hub' }
        )}
        color="danger"
        iconType="alert"
      >
        <p>{error}</p>
        <EuiButton size="s" onClick={() => void fetchOverview()}>
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.reportTable.canvasRetry',
            { defaultMessage: 'Retry' }
          )}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div data-test-subj="threatIntelReportTableCanvas">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {rangeLabel}
            {scope?.query ? (
              <>
                {' · '}
                {scope.query}
              </>
            ) : null}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="refresh" onClick={() => void fetchOverview()} isLoading={loading}>
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.reportTable.canvasRefresh',
              { defaultMessage: 'Refresh' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <IntelligenceHubDashboardView
        data={data}
        filters={filters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onToggleSeverity={toggleSeverity}
        onToggleCategory={toggleCategory}
        onClearChipFilters={clearChipFilters}
        highlightReportId={highlightReportId}
        onHighlightReport={setHighlightReportId}
      />
    </div>
  );
};
