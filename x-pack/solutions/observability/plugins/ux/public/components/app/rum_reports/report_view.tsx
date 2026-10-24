/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  canGoToNextCalendarWeek,
  isCurrentCalendarWeek,
  isRumReportTemplateId,
  shiftCalendarWeek,
  type RumReportResponse,
} from '../../../../common/rum_report';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumReport } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { useHasRumData } from '../rum_dashboard/hooks/use_has_rum_data';
import { ErrorsReport } from './errors_report';
import { PagesReport } from './pages_report';
import { ReportCover } from './report_cover';
import { ReportToolbar } from './report_toolbar';
import { AiReportPanel } from './ai_report_panel';
import { ScheduleEmailFlyout } from './schedule_email_flyout';
import { useRumAlertFlyout } from '../rum_alerts/alert_flyout_context';
import { ScorecardReport } from './scorecard';
import { ClientsReport, FrustrationReport, FunnelReport, UsersReport } from './thin_reports';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';
import { useSyncOpenWithTourStep } from '../rum_tour/use_sync_open_with_tour_step';

const filterChip = (label: string, value?: string) => (value ? [{ label, value }] : []);

export function RumReportView({ templateId }: { templateId: string }) {
  const { http } = useKibanaServices();
  const history = useHistory();
  const { open: openAlert } = useRumAlertFlyout();
  const { hasData, loading: hasDataLoading } = useHasRumData();
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      exactStart,
      exactEnd,
      serviceName,
      browser,
      os,
      location,
      pageUrl,
      frustration,
      user,
      includeBots,
      botUa,
      kuery,
      breakpoint,
      connection,
      device,
      errorGroup,
      compare,
      includePii,
    },
  } = useLegacyUrlParams();

  const [data, setData] = useState<RumReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  useSyncOpenWithTourStep('scheduleEmail', setScheduleOpen);

  const piiOn = includePii === 'true';
  const compareMode = compare === 'none' ? 'none' : 'previous';

  const load = useCallback(async () => {
    if (!isRumReportTemplateId(templateId)) {
      setError(
        i18n.translate('xpack.ux.reports.unknownTemplateErrorMessage', {
          defaultMessage: 'Unknown report template',
        })
      );
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumReport({
        http,
        templateId,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        browser,
        os,
        pageUrl,
        frustration,
        user,
        includeBots,
        botUa,
        kuery,
        breakpoint,
        connection,
        device,
        errorGroup,
        compare: compareMode,
        includePii: piiOn,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    browser,
    breakpoint,
    compareMode,
    connection,
    device,
    errorGroup,
    frustration,
    http,
    includeBots,
    botUa,
    kuery,
    os,
    pageUrl,
    piiOn,
    rangeFrom,
    rangeTo,
    serviceName,
    templateId,
    user,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isRumReportTemplateId(templateId)) {
    return (
      <EuiCallOut
        announceOnMount
        color="warning"
        title={i18n.translate('xpack.ux.reports.unknownTemplateTitle', {
          defaultMessage: 'Unknown report',
        })}
      >
        <EuiButton
          data-test-subj="uxReportUnknownBack"
          onClick={() => pushRumPath(history, '/reports')}
        >
          {i18n.translate('xpack.ux.reports.backToCatalogButtonLabel', {
            defaultMessage: 'Back to catalog',
          })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (!hasDataLoading && !hasData) {
    return (
      <EuiEmptyPrompt
        iconType="chartArea"
        title={
          <h2>
            {i18n.translate('xpack.ux.reports.noRumDataTitle', { defaultMessage: 'Add RUM data' })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.ux.reports.noRumDataDescription', {
              defaultMessage: 'No RUM data found yet. Capture traffic, then refresh.',
            })}
          </p>
        }
      />
    );
  }

  if (loading && !data) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={i18n.translate('xpack.ux.reports.loadErrorTitle', {
          defaultMessage: 'Unable to load report',
        })}
      >
        <p>{error}</p>
        <EuiButton data-test-subj="uxReportRetry" color="danger" onClick={() => void load()}>
          {i18n.translate('xpack.ux.reports.retryButtonLabel', { defaultMessage: 'Retry' })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (!data) {
    return null;
  }

  const noRows =
    (data.templateId === 'scorecard' &&
      (data.kpis.sessions.current ?? 0) === 0 &&
      (data.kpis.pageViews.current ?? 0) === 0) ||
    (data.templateId === 'pages' && (data.kpis.pageViews.current ?? 0) === 0);

  const chips = [
    ...filterChip(
      i18n.translate('xpack.ux.reports.filter.browserLabel', { defaultMessage: 'Browser' }),
      browser
    ),
    ...filterChip(i18n.translate('xpack.ux.reports.filter.osLabel', { defaultMessage: 'OS' }), os),
    ...filterChip(
      i18n.translate('xpack.ux.reports.filter.pageLabel', { defaultMessage: 'Page' }),
      pageUrl
    ),
    ...filterChip(
      i18n.translate('xpack.ux.reports.filter.userLabel', { defaultMessage: 'User' }),
      user
    ),
    ...filterChip(
      i18n.translate('xpack.ux.reports.filter.kueryLabel', { defaultMessage: 'KQL' }),
      kuery
    ),
  ];

  return (
    <div className="uxRumReportRoot" data-test-subj="uxReportView">
      <ReportToolbar
        report={data}
        includePii={piiOn}
        exactStart={exactStart}
        exactEnd={exactEnd}
        captureRoot={captureRef}
        onGenerateAi={() => setAiOpen(true)}
        onScheduleEmail={() => setScheduleOpen(true)}
        onCreateAlert={() => openAlert({ templateId: 'web_vital' })}
      />
      {scheduleOpen && (
        <ScheduleEmailFlyout
          templateId={data.templateId}
          title={data.title}
          rangeFrom={data.rangeFrom}
          rangeTo={data.rangeTo}
          compare={compareMode}
          filters={{
            serviceName,
            browser,
            os,
            location,
            pageUrl,
            frustration,
            user,
            includeBots,
            kuery,
            breakpoint,
            connection,
            device,
            errorGroup,
            includePii: piiOn,
          }}
          onClose={() => setScheduleOpen(false)}
        />
      )}
      <div ref={captureRef} className="uxRumReportCapture">
        <AiReportPanel report={data} expanded={aiOpen} />
        <EuiSpacer size="m" />
        <UxTourAnchor stepId="reportView" display="block">
          <ReportCover
            report={data}
            filterChips={chips}
            canNextWeek={canGoToNextCalendarWeek(rangeFrom)}
            isThisWeek={isCurrentCalendarWeek(rangeFrom)}
            onPrevWeek={() => {
              const period = shiftCalendarWeek(rangeFrom, -1);
              if (period) {
                pushRumPath(history, `/reports/${templateId}`, period);
              }
            }}
            onNextWeek={() => {
              const period = shiftCalendarWeek(rangeFrom, 1);
              if (period) {
                pushRumPath(history, `/reports/${templateId}`, period);
              }
            }}
          />
        </UxTourAnchor>
        <EuiSpacer />
        {noRows ? (
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('xpack.ux.reports.emptyPeriodTitle', {
                  defaultMessage: 'No sessions in this range',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.ux.reports.emptyPeriodDescription', {
                  defaultMessage: 'Widen the range or drop filters.',
                })}
              </p>
            }
            actions={[
              <EuiButton
                key="clear"
                data-test-subj="uxReportClearFilters"
                fill
                onClick={() =>
                  pushRumPath(history, `/reports/${templateId}`, {
                    browser: '',
                    os: '',
                    pageUrl: '',
                    frustration: '',
                    user: '',
                    kuery: '',
                    breakpoint: '',
                    connection: '',
                    device: '',
                    errorGroup: '',
                  })
                }
              >
                {i18n.translate('xpack.ux.reports.clearFiltersButtonLabel', {
                  defaultMessage: 'Clear filters',
                })}
              </EuiButton>,
              <EuiButtonEmpty
                key="sessions"
                data-test-subj="uxReportOpenSessions"
                onClick={() => pushRumPath(history, '/session-replay', sessionsPatch({}))}
              >
                {i18n.translate('xpack.ux.reports.openSessionsButtonLabel', {
                  defaultMessage: 'Open Sessions',
                })}
              </EuiButtonEmpty>,
            ]}
          />
        ) : (
          <>
            {data.templateId === 'scorecard' && <ScorecardReport report={data} />}
            {data.templateId === 'pages' && <PagesReport report={data} />}
            {data.templateId === 'errors' && <ErrorsReport report={data} />}
            {data.templateId === 'frustration' && <FrustrationReport report={data} />}
            {data.templateId === 'funnel' && <FunnelReport report={data} />}
            {data.templateId === 'clients' && <ClientsReport report={data} />}
            {data.templateId === 'users' && <UsersReport report={data} />}
          </>
        )}
        <EuiSpacer />
      </div>
      <EuiText size="xs" color="subdued" className="uxRumReportNoPrint">
        {i18n.translate('xpack.ux.reports.footer.generatedLabel', {
          defaultMessage: 'Generated {when}',
          values: { when: data.generatedAt },
        })}
      </EuiText>
    </div>
  );
}
