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
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
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
import { useHasRumData } from '../rum_dashboard/hooks/use_has_rum_data';
import { TrendMetric } from './trend_metric';

const percent = (ratio: number): string => `${Math.round(ratio * 1000) / 10}%`;

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
  const { hasData, loading: hasDataLoading } = useHasRumData();
  const {
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      pageUrl,
      frustration,
      user,
      includeBots,
      kuery,
      breakpoint,
      connection,
      device,
    },
  } = useLegacyUrlParams();

  const [data, setData] = useState<RumOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
        pageUrl,
        frustration,
        user,
        includeBots,
        kuery,
        breakpoint,
        connection,
        device,
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
    pageUrl,
    frustration,
    user,
    includeBots,
    kuery,
    breakpoint,
    connection,
    device,
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
    });
  }, [data, loading]);

  if (!hasDataLoading && !hasData) {
    return (
      <EuiEmptyPrompt
        data-test-subj="rumNoDataCard"
        iconType="visArea"
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
      name: i18n.translate('xpack.ux.overview.pages.lcp', { defaultMessage: 'LCP p75' }),
      width: '100px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Inp',
      name: i18n.translate('xpack.ux.overview.pages.inp', { defaultMessage: 'INP p75' }),
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
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
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
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
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
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
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
            <EuiSpacer size="s" />
            {CoreVitals}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
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
            <EuiSpacer size="m" />
            <TrendMetric
              id="sessions"
              label={i18n.translate('xpack.ux.overview.trendsSessions', {
                defaultMessage: 'Sessions',
              })}
              points={data.trends}
              accessor="sessions"
              color={euiTheme.colors.vis.euiColorVis0}
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
            />
            <EuiSpacer size="s" />
            <TrendMetric
              id="errors"
              label={i18n.translate('xpack.ux.overview.trendsErrors', { defaultMessage: 'Errors' })}
              points={data.trends}
              accessor="errors"
              color={euiTheme.colors.danger}
              invertDelta
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.overview.frustrationTitle', {
                  defaultMessage: 'Frustration signals',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiLink
                  data-test-subj="uxRumOverviewV2Link"
                  onClick={() =>
                    pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'rage' }))
                  }
                >
                  <EuiStat
                    title={String(data.frustration.rageSessions)}
                    description={i18n.translate('xpack.ux.overview.frustration.rage', {
                      defaultMessage: 'Rage-click sessions',
                    })}
                    titleSize="s"
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink
                  data-test-subj="uxRumOverviewV2Link"
                  onClick={() =>
                    pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'error' }))
                  }
                >
                  <EuiStat
                    title={String(data.frustration.errorSessions)}
                    description={i18n.translate('xpack.ux.overview.frustration.errors', {
                      defaultMessage: 'Sessions with errors',
                    })}
                    titleSize="s"
                  />
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink
                  data-test-subj="uxRumOverviewV2Link"
                  onClick={() =>
                    pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'dead' }))
                  }
                >
                  <EuiStat
                    title={String(data.frustration.deadClickSessions)}
                    description={i18n.translate('xpack.ux.overview.frustration.dead', {
                      defaultMessage: 'Dead-click sessions',
                    })}
                    titleSize="s"
                  />
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.overview.breakdownTitle', {
                  defaultMessage: 'Browsers & OS',
                })}
              </h3>
            </EuiTitle>
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
