/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import { useHistory } from 'react-router-dom';
import type { RumOverviewResponse, RumPageRow } from '../../../common/rum_app';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchRumOverview } from '../../services/rest/rum_api';
import { mergeRumSearch, pushRumPath, sessionsPatch, uxAppHref } from '../../utils/rum_search';
import { VisitorCountriesPanel } from '../../components/app/rum_overview/visitor_countries';
import { FrustrationSignalsPanel } from '../../components/app/rum_overview/frustration_signals';
import { TrendMetric } from '../../components/app/rum_overview/trend_metric';
import { overviewPanelStateToQuery } from '../../../common/embeddables/overview_panel/serialize_state';
import { uxOverviewConvertTitle } from '../../../common/embeddables/overview_panel/panel_copy';
import type { UxOverviewPanelCustomState } from '../../../common/embeddables/overview_panel/types';
import {
  isUxOverviewWorkflowPanelKind,
  type UxOverviewChartPanelKind,
} from '../../../common/embeddables/overview_panel/constants';
import { UxWorkflowEmbeddableBody } from './extra_panels';

const percent = (ratio: number | null): string =>
  ratio == null ? '—' : `${Math.round(ratio * 1000) / 10}%`;

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

export function UxOverviewEmbeddableBody({
  state,
  title,
  rangeFrom,
  rangeTo,
}: {
  state: UxOverviewPanelCustomState;
  title?: string;
  rangeFrom: string;
  rangeTo: string;
}) {
  if (state.panel === 'cover') {
    return <CoverBlock state={state} title={title} rangeFrom={rangeFrom} rangeTo={rangeTo} />;
  }
  if (isUxOverviewWorkflowPanelKind(state.panel)) {
    return <UxWorkflowEmbeddableBody state={state} rangeFrom={rangeFrom} rangeTo={rangeTo} />;
  }
  return <UxOverviewEmbeddableFetchedBody state={state} rangeFrom={rangeFrom} rangeTo={rangeTo} />;
}

const CoverBlock = ({
  state,
  title,
  rangeFrom,
  rangeTo,
}: {
  state: UxOverviewPanelCustomState;
  title?: string;
  rangeFrom: string;
  rangeTo: string;
}) => {
  const { http } = useKibanaServices();
  const heading = title?.trim() || uxOverviewConvertTitle(state.service_name);
  const { serviceName: _serviceName, ...patch } = overviewPanelStateToQuery({
    ...state,
    range_from: rangeFrom,
    range_to: rangeTo,
  });
  const search = mergeRumSearch('', patch);
  const hrefFor = (suffix: string): string =>
    uxAppHref(http.basePath.prepend.bind(http.basePath), {
      serviceName: state.service_name,
      suffix,
      search,
    });

  const chips = [
    state.kuery
      ? {
          key: 'kuery',
          label: i18n.translate('xpack.ux.dashboard.cover.kqlChipLabel', {
            defaultMessage: 'KQL: {kuery}',
            values: { kuery: state.kuery },
          }),
        }
      : undefined,
    state.browser
      ? {
          key: 'browser',
          label: i18n.translate('xpack.ux.dashboard.cover.browserChipLabel', {
            defaultMessage: 'Browser: {browser}',
            values: { browser: state.browser },
          }),
        }
      : undefined,
    state.os
      ? {
          key: 'os',
          label: i18n.translate('xpack.ux.dashboard.cover.osChipLabel', {
            defaultMessage: 'OS: {os}',
            values: { os: state.os },
          }),
        }
      : undefined,
    state.location
      ? {
          key: 'location',
          label: i18n.translate('xpack.ux.dashboard.cover.countryChipLabel', {
            defaultMessage: 'Country: {location}',
            values: { location: state.location },
          }),
        }
      : undefined,
    state.page_url
      ? {
          key: 'page',
          label: i18n.translate('xpack.ux.dashboard.cover.pageChipLabel', {
            defaultMessage: 'Page: {page}',
            values: { page: state.page_url },
          }),
        }
      : undefined,
  ].filter((chip): chip is { key: string; label: string } => chip !== undefined);

  return (
    <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>{heading}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.ux.dashboard.cover.introDescription', {
            defaultMessage:
              'Snapshot of this app. Hide or rearrange panels here. The session player, click maps, and reports stay in User Experience.',
          })}
        </EuiText>
        {chips.length > 0 ? (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {chips.map((chip) => (
                <EuiFlexItem key={chip.key} grow={false}>
                  <EuiBadge>{chip.label}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="popper"
              href={hrefFor('')}
              data-test-subj="uxDashboardCoverOpenOverview"
            >
              {i18n.translate('xpack.ux.dashboard.cover.overviewButtonLabel', {
                defaultMessage: 'Open overview',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="play"
              href={hrefFor('/session-replay')}
              data-test-subj="uxDashboardCoverSessions"
            >
              {i18n.translate('xpack.ux.dashboard.cover.sessionsButtonLabel', {
                defaultMessage: 'Session replay',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="chartArea"
              href={hrefFor('/reports/scorecard')}
              data-test-subj="uxDashboardCoverScorecard"
            >
              {i18n.translate('xpack.ux.dashboard.cover.scorecardButtonLabel', {
                defaultMessage: 'Weekly scorecard',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function UxOverviewEmbeddableFetchedBody({
  state,
  rangeFrom,
  rangeTo,
}: {
  state: UxOverviewPanelCustomState;
  rangeFrom: string;
  rangeTo: string;
}) {
  const { http } = useKibanaServices();
  const [data, setData] = useState<RumOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serializedKey = JSON.stringify({ ...state, range_from: rangeFrom, range_to: rangeTo });

  useEffect(() => {
    const query = overviewPanelStateToQuery(
      JSON.parse(serializedKey) as UxOverviewPanelCustomState
    );
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchRumOverview({ http, ...query })
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [http, serializedKey]);

  if (loading && !data) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: 160,
        }}
      >
        <EuiLoadingSpinner size="l" />
      </div>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        title={i18n.translate('xpack.ux.dashboard.embeddable.errorTitle', {
          defaultMessage: 'Unable to load this panel',
        })}
      >
        <p>{error}</p>
      </EuiCallOut>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <UxOverviewEmbeddableContent
      panel={state.panel as UxOverviewChartPanelKind}
      data={data}
      loading={loading}
    />
  );
}

const UxOverviewEmbeddableContent = ({
  panel,
  data,
  loading,
}: {
  panel: UxOverviewChartPanelKind;
  data: RumOverviewResponse;
  loading: boolean;
}) => {
  switch (panel) {
    case 'cover':
      return null;
    case 'kpis':
      return <KpiRow data={data} />;
    case 'vitals':
      return <VitalsBlock data={data} loading={loading} />;
    case 'trends':
      return <TrendsBlock data={data} />;
    case 'frustration':
      return (
        <FrustrationSignalsPanel
          frustration={data.frustration}
          sessions={data.kpis.sessions}
          budgets={[]}
          hideHeader
          flush
        />
      );
    case 'browsers':
      return <BrowsersBlock data={data} />;
    case 'countries':
      return (
        <VisitorCountriesPanel
          countries={data.countries}
          maxPageViews={Math.max(1, ...data.countries.map((row) => row.pageViews))}
          hideHeader
          flush
        />
      );
    case 'pages':
      return <PagesBlock data={data} />;
  }
};

const KpiRow = ({ data }: { data: RumOverviewResponse }) => {
  const history = useHistory();
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiLink
          data-test-subj="uxDashboardKpiSessions"
          onClick={() => pushRumPath(history, '/session-replay', sessionsPatch({}))}
        >
          <EuiStat
            title={String(data.kpis.sessions)}
            titleSize="s"
            description={i18n.translate('xpack.ux.overview.kpi.sessions', {
              defaultMessage: 'Sessions',
            })}
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink
          data-test-subj="uxDashboardKpiPageViews"
          onClick={() => pushRumPath(history, '/pages')}
        >
          <EuiStat
            title={String(data.kpis.pageViews)}
            titleSize="s"
            description={i18n.translate('xpack.ux.overview.kpi.pageViews', {
              defaultMessage: 'Page views',
            })}
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={percent(data.kpis.errorRate)}
          titleSize="s"
          description={i18n.translate('xpack.ux.overview.kpi.errorRate', {
            defaultMessage: 'Error rate',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink
          data-test-subj="uxDashboardKpiBounce"
          onClick={() =>
            pushRumPath(history, '/session-replay', sessionsPatch({ hasBounced: 'true' }))
          }
        >
          <EuiStat
            title={percent(data.kpis.bounceRate)}
            titleSize="s"
            description={i18n.translate('xpack.ux.overview.kpi.bounceRate', {
              defaultMessage: 'Bounce rate',
            })}
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={formatMs(data.kpis.p75LoadMs)}
          titleSize="s"
          description={i18n.translate('xpack.ux.overview.kpi.load', {
            defaultMessage: 'p75 load',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          title={formatMs(data.kpis.p75Inp)}
          titleSize="s"
          description={i18n.translate('xpack.ux.overview.kpi.inp', {
            defaultMessage: 'p75 INP',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const VitalsBlock = ({ data, loading }: { data: RumOverviewResponse; loading: boolean }) => {
  const CoreVitals = useMemo(() => {
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

  return <>{CoreVitals}</>;
};

const TrendsBlock = ({ data }: { data: RumOverviewResponse }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <TrendMetric
        id="sessions"
        label={i18n.translate('xpack.ux.overview.trendsSessions', { defaultMessage: 'Sessions' })}
        points={data.trends}
        accessor="sessions"
        color={euiTheme.colors.vis.euiColorVis0}
        chartType="area"
        chartHeight={72}
      />
      <EuiSpacer size="s" />
      <TrendMetric
        id="pageViews"
        label={i18n.translate('xpack.ux.overview.trendsViews', { defaultMessage: 'Page views' })}
        points={data.trends}
        accessor="pageViews"
        color={euiTheme.colors.vis.euiColorVis1}
        chartType="area"
        chartHeight={72}
      />
      <EuiSpacer size="s" />
      <TrendMetric
        id="errors"
        label={i18n.translate('xpack.ux.overview.trendsErrors', { defaultMessage: 'Errors' })}
        points={data.trends}
        accessor="errors"
        color={euiTheme.colors.danger}
        invertDelta
        chartType="area"
        chartHeight={72}
      />
    </>
  );
};

const BrowsersBlock = ({ data }: { data: RumOverviewResponse }) => {
  const history = useHistory();
  return (
    <>
      {data.browsers.slice(0, 5).map((bucket) => (
        <div key={`browser-${bucket.key}`}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="BrowsersBlockLink"
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
      {data.os.slice(0, 5).map((bucket) => (
        <div key={`os-${bucket.key}`}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="BrowsersBlockLink"
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
  );
};

const PagesBlock = ({ data }: { data: RumOverviewResponse }) => {
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<RumPageRow>> = [
    {
      field: 'path',
      name: i18n.translate('xpack.ux.overview.pages.path', { defaultMessage: 'Page' }),
      render: (path: string) => (
        <EuiLink
          data-test-subj="ColumnsLink"
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
      field: 'errorCount',
      name: i18n.translate('xpack.ux.overview.pages.errors', { defaultMessage: 'Errors' }),
      width: '90px',
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.ux.overview.topPagesCaption', {
        defaultMessage: 'Top pages by views',
      })}
      items={data.topPages}
      columns={columns}
    />
  );
};
