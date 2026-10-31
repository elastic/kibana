/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import type { RumOverviewResponse, RumPageRow } from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumOverview } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalColumnName } from '../../../utils/vital_help_label';
import { useHasRumData } from '../rum_dashboard/hooks/use_has_rum_data';
import { TrendChartTypeGroup, TrendMetric, useTrendChartType } from './trend_metric';
import { VisitorCountriesPanel } from './visitor_countries';
import { ClickMapPanel } from './click_map_panel';
import { FrustrationSignalsPanel } from './frustration_signals';
import { AddToDashboardButton } from './dashboard_actions';
import { useRumAlertFlyout } from '../rum_alerts/alert_flyout_context';
import { useRumBudgetFlyout } from '../rum_budgets/budget_flyout_context';
import { BudgetChips } from '../rum_budgets/budget_chips';
import { useRumBudgets } from '../rum_budgets/use_rum_budgets';
import { useRumPageLoading } from '../rum_dashboard/rum_page_loading';

const percent = (ratio: number | null): string =>
  ratio == null ? '—' : `${Math.round(ratio * 1000) / 10}%`;

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

export function RumOverviewV2() {
  const { euiTheme } = useEuiTheme();
  const { http, docLinks } = useKibanaServices();
  const history = useHistory();
  const { open: openAlert } = useRumAlertFlyout();
  const { open: openBudget } = useRumBudgetFlyout();
  const { items: budgets } = useRumBudgets();
  const { hasData, loading: hasDataLoading } = useHasRumData();
  const [trendChartType, setTrendChartType] = useTrendChartType();
  const {
    rangeId,
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
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
      analyticsMode,
    },
  } = useLegacyUrlParams();

  const [data, setData] = useState<RumOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useRumPageLoading('overview', loading);

  const locationFilter = typeof location === 'string' ? location : undefined;

  const load = useCallback(async () => {
    void rangeId;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumOverview({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        browser,
        os,
        location: locationFilter,
        pageUrl,
        frustration,
        user,
        includeBots,
        botUa,
        kuery,
        breakpoint,
        connection,
        device,
        analyticsMode,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    browser,
    os,
    locationFilter,
    pageUrl,
    frustration,
    user,
    includeBots,
    botUa,
    kuery,
    breakpoint,
    connection,
    device,
    analyticsMode,
    rangeId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const CoreVitals = useMemo(() => {
    if (!data) {
      return null;
    }
    const { lcp, inp, cls, fcp } = data.vitals;
    return getCoreVitalsComponent({
      data: {
        lcp: lcp.p75,
        fcp: fcp.p75,
        cls: cls.p75,
        inp: inp.p75,
        tbt: 0,
        coreVitalPages: lcp.samples || inp.samples,
        lcpRanks: lcp.ranks ? [lcp.ranks.good, lcp.ranks.ni, lcp.ranks.poor] : undefined,
        clsRanks: cls.ranks ? [cls.ranks.good, cls.ranks.ni, cls.ranks.poor] : undefined,
        inpRanks: inp.ranks ? [inp.ranks.good, inp.ranks.ni, inp.ranks.poor] : undefined,
        hasINP: inp.samples > 0,
      },
      loading,
      totalPageViews: data.kpis.pageViews,
      displayTrafficMetric: true,
      layout: 'column',
    });
  }, [data, loading]);

  if (!hasDataLoading && !hasData) {
    return (
      <EuiEmptyPrompt
        data-test-subj="rumNoDataCard"
        iconType="chartArea"
        title={
          <h2>
            {i18n.translate('xpack.ux.overview.beatsCard.title', {
              defaultMessage: 'Add RUM data',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.ux.overview.otelEmpty.description', {
              defaultMessage:
                'No page-load or EDOT Browser documentLoad data found yet. Capture traffic with Elastic RUM or EDOT Browser (otlp → traces-*.otel-* / logs-*.otel-*), then refresh. The Sessions tab can still list visits that have Session Replay.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            data-test-subj="uxRumOverviewAddRumDataButton"
            href={http.basePath.prepend('/app/apm/tutorial')}
            fill
          >
            {i18n.translate('xpack.ux.overview.beatsCard.buttonLabel', {
              defaultMessage: 'Add RUM data',
            })}
          </EuiButton>,
          <EuiButton
            data-test-subj="uxRumOverviewV2ReadTheDocsButton"
            href={docLinks.links.observability.guide}
            target="_blank"
          >
            {i18n.translate('xpack.ux.overview.readDocs', { defaultMessage: 'Read the docs' })}
          </EuiButton>,
        ]}
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
        title={i18n.translate('xpack.ux.overview.errorTitle', {
          defaultMessage: 'Unable to load overview',
        })}
      >
        <p>{error}</p>
        <EuiButton
          data-test-subj="uxRumOverviewV2RetryButton"
          color="danger"
          onClick={() => void load()}
        >
          {i18n.translate('xpack.ux.overview.retry', { defaultMessage: 'Retry' })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (!data) {
    return null;
  }

  const pageColumns: Array<EuiBasicTableColumn<RumPageRow>> = [
    {
      field: 'path',
      name: i18n.translate('xpack.ux.overview.pages.path', { defaultMessage: 'Page' }),
      render: (path: string) => (
        <EuiLink
          data-test-subj={`uxOverviewPage-${path}`}
          onClick={() => pushRumPath(history, '/pages', { pageUrl: path })}
        >
          {path}
        </EuiLink>
      ),
    },
    {
      field: 'views',
      name: i18n.translate('xpack.ux.overview.pages.views', { defaultMessage: 'Views' }),
      width: '90px',
    },
    {
      field: 'p75Lcp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.overview.pages.lcp', { defaultMessage: 'LCP p75' })}
          tooltip={VITAL_P75_HELP.lcp}
        />
      ),
      width: '120px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Inp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.overview.pages.inp', { defaultMessage: 'INP p75' })}
          tooltip={VITAL_P75_HELP.inp}
        />
      ),
      width: '100px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'errorCount',
      name: i18n.translate('xpack.ux.overview.pages.errors', { defaultMessage: 'Errors' }),
      width: '90px',
    },
  ];

  return (
    <div data-test-subj="uxRumOverviewV2">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiLink
              data-test-subj="uxOverviewKpiSessions"
              onClick={() => pushRumPath(history, '/session-replay', sessionsPatch({}))}
            >
              <EuiStat
                title={String(data.kpis.sessions)}
                titleSize="m"
                description={i18n.translate('xpack.ux.overview.kpi.sessions', {
                  defaultMessage: 'Sessions',
                })}
              />
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiLink
              data-test-subj="uxOverviewKpiPageViews"
              onClick={() => pushRumPath(history, '/pages')}
            >
              <EuiStat
                title={String(data.kpis.pageViews)}
                titleSize="m"
                description={i18n.translate('xpack.ux.overview.kpi.pageViews', {
                  defaultMessage: 'Page views',
                })}
              />
            </EuiLink>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiLink
              data-test-subj="uxOverviewKpiErrors"
              onClick={() =>
                pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'error' }))
              }
            >
              <EuiStat
                title={percent(data.kpis.errorRate)}
                titleSize="m"
                description={i18n.translate('xpack.ux.overview.kpi.errorRate', {
                  defaultMessage: 'Error rate',
                })}
              />
            </EuiLink>
            <EuiSpacer size="xs" />
            <BudgetChips items={budgets} templateId="error_rate" pagePath={pageUrl} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiLink
                  data-test-subj="uxOverviewKpiBounce"
                  onClick={() =>
                    pushRumPath(history, '/session-replay', sessionsPatch({ hasBounced: 'true' }))
                  }
                >
                  <EuiStat
                    title={percent(data.kpis.bounceRate)}
                    titleSize="m"
                    description={i18n.translate('xpack.ux.overview.kpi.bounceRate', {
                      defaultMessage: 'Bounce rate',
                    })}
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.ux.overview.kpi.bounceRateTip', {
                    defaultMessage:
                      'Share of sessions that viewed exactly one page. Sessions with no page view are excluded.',
                  })}
                  type="info"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <BudgetChips items={budgets} templateId="session_bounce" pagePath={pageUrl} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiLink
                  data-test-subj="uxOverviewKpiLoad"
                  onClick={() => pushRumPath(history, '/pages')}
                >
                  <EuiStat
                    title={formatMs(data.kpis.p75LoadMs)}
                    titleSize="m"
                    description={i18n.translate('xpack.ux.overview.kpi.load', {
                      defaultMessage: 'p75 load',
                    })}
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip content={VITAL_P75_HELP.load} type="info" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <BudgetChips items={budgets} templateId="page_load" pagePath={pageUrl} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiLink
                  data-test-subj="uxOverviewKpiInp"
                  onClick={() => pushRumPath(history, '/pages')}
                >
                  <EuiStat
                    title={formatMs(data.kpis.p75Inp)}
                    titleSize="m"
                    description={i18n.translate('xpack.ux.overview.kpi.inp', {
                      defaultMessage: 'p75 INP',
                    })}
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip content={VITAL_P75_HELP.inp} type="info" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <BudgetChips items={budgets} templateId="inp" pagePath={pageUrl} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="s">
        <EuiFlexGroup gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxOverviewAlertSessions"
              onClick={() =>
                openAlert({
                  templateId: 'traffic_drop',
                  threshold: Math.max(1, Math.round(data.kpis.sessions * 0.5)),
                })
              }
            >
              {i18n.translate('xpack.ux.overview.alertSessions', {
                defaultMessage: 'Alert on traffic',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxOverviewAlertTrafficSpike"
              onClick={() =>
                openAlert({
                  templateId: 'traffic_spike',
                  threshold: Math.max(10, Math.round(data.kpis.sessions * 2)),
                })
              }
            >
              {i18n.translate('xpack.ux.overview.alertTrafficSpikeButtonLabel', {
                defaultMessage: 'Alert on spike',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxOverviewAlertErrors"
              onClick={() =>
                openAlert({
                  templateId: 'error_rate',
                  threshold: Math.max(0.01, Number((data.kpis.errorRate + 0.02).toFixed(2))),
                })
              }
            >
              {i18n.translate('xpack.ux.overview.alertErrors', {
                defaultMessage: 'Alert on errors',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxOverviewAlertInp"
              onClick={() =>
                openAlert({
                  templateId: 'web_vital',
                  vital: 'inp',
                  threshold: data.kpis.p75Inp ?? 200,
                })
              }
            >
              {i18n.translate('xpack.ux.overview.alertInp', { defaultMessage: 'Alert on INP' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxOverviewAlertFrustration"
              onClick={() => openAlert({ templateId: 'frustration' })}
            >
              {i18n.translate('xpack.ux.overview.alertFrustration', {
                defaultMessage: 'Alert on frustration',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              data-test-subj="uxOverviewSetBudget"
              onClick={() => openBudget({ templateId: 'lcp' })}
            >
              {i18n.translate('xpack.ux.overview.setBudgetButtonLabel', {
                defaultMessage: 'Set performance budget',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer />

      <EuiFlexGroup alignItems="stretch">
        <EuiFlexItem grow={2}>
          <EuiPanel hasBorder paddingSize="m" style={{ height: '100%' }}>
            <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <EuiLink
                      data-test-subj="uxOverviewCwvLink"
                      onClick={() => pushRumPath(history, '/pages')}
                    >
                      {i18n.translate('xpack.ux.overview.cwvTitle', {
                        defaultMessage: 'Core Web Vitals',
                      })}
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddToDashboardButton panel="vitals" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {CoreVitals}
            <EuiSpacer size="s" />
            <BudgetChips
              items={budgets}
              templateIds={['lcp', 'fcp', 'cls', 'ttfb']}
              pagePath={pageUrl}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={5} style={{ display: 'flex' }}>
          <EuiPanel
            hasBorder
            paddingSize="m"
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.ux.overview.trendsTitle', { defaultMessage: 'Trends' })}
                  </h3>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.ux.overview.trendsSubtitle', {
                    defaultMessage: 'Volume over the selected range',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <AddToDashboardButton panel="trends" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <TrendChartTypeGroup chartType={trendChartType} onChange={setTrendChartType} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <TrendMetric
              id="sessions"
              label={i18n.translate('xpack.ux.overview.trendsSessions', {
                defaultMessage: 'Sessions',
              })}
              points={data.trends}
              accessor="sessions"
              color={euiTheme.colors.vis.euiColorVis0}
              chartType={trendChartType}
              chartHeight={128}
            />
            <EuiSpacer size="s" />
            <TrendMetric
              id="pageViews"
              label={i18n.translate('xpack.ux.overview.trendsViews', {
                defaultMessage: 'Page views',
              })}
              points={data.trends}
              accessor="pageViews"
              color={euiTheme.colors.vis.euiColorVis1}
              chartType={trendChartType}
              chartHeight={128}
            />
            <EuiSpacer size="s" />
            <TrendMetric
              id="errors"
              label={i18n.translate('xpack.ux.overview.trendsErrors', { defaultMessage: 'Errors' })}
              points={data.trends}
              accessor="errors"
              color={euiTheme.colors.danger}
              invertDelta
              chartType={trendChartType}
              chartHeight={128}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <ClickMapPanel />

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem style={{ display: 'flex' }}>
          <FrustrationSignalsPanel
            frustration={data.frustration}
            sessions={data.kpis.sessions}
            budgets={budgets}
            pageUrl={pageUrl}
            headerExtra={<AddToDashboardButton panel="frustration" />}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ display: 'flex' }}>
          <EuiPanel
            hasBorder
            paddingSize="m"
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.ux.overview.breakdownTitle', {
                      defaultMessage: 'Browsers & OS',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddToDashboardButton panel="browsers" />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {data.browsers.slice(0, 5).map((bucket) => (
              <div key={`browser-${bucket.key}`}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      data-test-subj={`uxOverviewBrowser-${bucket.key}`}
                      onClick={() =>
                        pushRumPath(
                          history,
                          '/session-replay',
                          sessionsPatch({ browser: bucket.key, os: '' })
                        )
                      }
                    >
                      <EuiBadge>{bucket.key}</EuiBadge>
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiProgress
                      value={bucket.count}
                      max={Math.max(1, data.kpis.sessions)}
                      size="s"
                      color="primary"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{bucket.count}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
              </div>
            ))}
            {data.os.length > 0 && (
              <>
                <EuiSpacer size="s" />
                {data.os.slice(0, 5).map((bucket) => (
                  <div key={`os-${bucket.key}`}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiLink
                          data-test-subj={`uxOverviewOs-${bucket.key}`}
                          onClick={() =>
                            pushRumPath(
                              history,
                              '/session-replay',
                              sessionsPatch({ os: bucket.key, browser: '' })
                            )
                          }
                        >
                          <EuiBadge>{bucket.key}</EuiBadge>
                        </EuiLink>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiProgress
                          value={bucket.count}
                          max={Math.max(1, data.kpis.sessions)}
                          size="s"
                          color="accent"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">{bucket.count}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="xs" />
                  </div>
                ))}
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <VisitorCountriesPanel
        countries={data.countries}
        activeLocation={locationFilter}
        maxPageViews={Math.max(1, ...data.countries.map((row) => row.pageViews))}
        headerExtra={<AddToDashboardButton panel="countries" />}
      />

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.overview.topPagesTitle', { defaultMessage: 'Top pages' })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <AddToDashboardButton panel="pages" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="uxRumOverviewV2ViewAllPagesLink"
                  onClick={() => pushRumPath(history, '/pages')}
                >
                  {i18n.translate('xpack.ux.overview.viewAllPages', {
                    defaultMessage: 'View all pages',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.overview.topPagesCaption', {
            defaultMessage: 'Top pages by views',
          })}
          items={data.topPages}
          columns={pageColumns}
          noItemsMessage={i18n.translate('xpack.ux.overview.noPages', {
            defaultMessage: 'No pages in this range',
          })}
        />
      </EuiPanel>
    </div>
  );
}
