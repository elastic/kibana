/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import {
  emptyPagesKpis,
  rateVital,
  UNGROUPED_PAGE_PATH,
  type RumPageRow,
  type RumPagesKpis,
  type RumResourceRow,
  type RumVitalAttribution,
  type RumVitalRating,
} from '../../../../common/rum_app';
import type { RumBackendCall } from '../../../../common/rum_backend';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumPageDetail, fetchRumPages } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import {
  AVG_LOAD_HELP,
  PASSING_CWV_HELP,
  POOR_LCP_HELP,
  VITAL_P75_HELP,
} from '../../../utils/vital_help';
import { VitalHelpLabel, VitalColumnName } from '../../../utils/vital_help_label';
import { uxFlyoutProps } from '../../flyout/ux_flyout_props';
import { Sparkline } from '../../session_replay/session_ui';
import { BackendCallsPanel } from '../../trace/backend_calls_panel';
import { SyntheticsMonitorChip } from '../../trace/synthetics_monitor_chip';
import { TraceWaterfallFlyout, type TraceFlyoutTarget } from '../../trace/trace_waterfall_flyout';
import { BudgetChips } from '../rum_budgets/budget_chips';
import { useRumBudgets } from '../rum_budgets/use_rum_budgets';
import { useRumPageLoading } from '../rum_dashboard/rum_page_loading';
import { TabTrendChart } from '../rum_overview/tab_trend_chart';

const ERROR_RATE_WARN = 0.05;

const displayPagePath = (path: string): string =>
  path === UNGROUPED_PAGE_PATH || path === ''
    ? i18n.translate('xpack.ux.pages.ungroupedPath', { defaultMessage: 'Ungrouped' })
    : path;

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const percent = (ratio: number | null): string =>
  ratio == null ? '—' : `${Math.round(ratio * 1000) / 10}%`;

const vitalBadge = (
  rating: RumVitalRating
): { color: 'success' | 'warning' | 'danger'; label: string; tooltip: string } => {
  if (rating === 'good') {
    return {
      color: 'success',
      label: i18n.translate('xpack.ux.pages.vital.goodBadge', { defaultMessage: 'Good' }),
      tooltip: i18n.translate('xpack.ux.pages.vital.goodTooltip', { defaultMessage: 'Good' }),
    };
  }
  if (rating === 'ni') {
    return {
      color: 'warning',
      label: i18n.translate('xpack.ux.pages.vital.niBadge', { defaultMessage: 'NI' }),
      tooltip: i18n.translate('xpack.ux.pages.vital.niTooltip', {
        defaultMessage: 'Needs improvement',
      }),
    };
  }
  return {
    color: 'danger',
    label: i18n.translate('xpack.ux.pages.vital.poorBadge', { defaultMessage: 'Poor' }),
    tooltip: i18n.translate('xpack.ux.pages.vital.poorTooltip', { defaultMessage: 'Poor' }),
  };
};

const VitalCell = ({
  vital,
  value,
  format,
}: {
  vital: 'lcp' | 'inp' | 'cls';
  value: number | null;
  format: (next: number | null) => string;
}) => {
  const rating = rateVital(vital, value);
  if (rating == null) {
    return <EuiText size="s">—</EuiText>;
  }
  const badge = vitalBadge(rating);
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{format(value)}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={badge.tooltip}>
          <EuiBadge color={badge.color} tabIndex={0}>
            {badge.label}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PagesKpiStrip = ({ kpis }: { kpis: RumPagesKpis }) => {
  const items: Array<{ title: string; description: React.ReactNode }> = [
    {
      title: String(kpis.views),
      description: i18n.translate('xpack.ux.pages.kpi.viewsLabel', { defaultMessage: 'Views' }),
    },
    {
      title: String(kpis.sessions),
      description: i18n.translate('xpack.ux.pages.kpi.sessionsLabel', {
        defaultMessage: 'Sessions',
      }),
    },
    {
      title: percent(kpis.passingCwvPct),
      description: (
        <VitalHelpLabel
          label={i18n.translate('xpack.ux.pages.kpi.passingCwvLabel', {
            defaultMessage: 'Views passing CWV',
          })}
          tooltip={PASSING_CWV_HELP}
        />
      ),
    },
    {
      title: String(kpis.poorLcpPages),
      description: (
        <VitalHelpLabel
          label={i18n.translate('xpack.ux.pages.kpi.poorLcpLabel', {
            defaultMessage: 'Pages with poor LCP',
          })}
          tooltip={POOR_LCP_HELP}
        />
      ),
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="uxRumPagesKpis">
      <EuiFlexGroup responsive={false} gutterSize="l" wrap>
        {items.map((item) => (
          <EuiFlexItem grow={false} key={item.title}>
            <EuiStat
              title={item.title}
              description={item.description}
              titleSize="s"
              textAlign="left"
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const truncateDetail = (value: string, max = 72): NonNullable<React.ReactNode> => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) {
    return compact;
  }
  return (
    <EuiToolTip content={compact}>
      <span
        tabIndex={0}
        css={css`
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: bottom;
        `}
      >
        {`${compact.slice(0, Math.max(24, max - 16))}…${compact.slice(-12)}`}
      </span>
    </EuiToolTip>
  );
};

const resourceFileName = (url: string): string => {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : parsed.hostname;
  } catch {
    const last = url.split('/').filter(Boolean).pop();
    return last ?? url;
  }
};

const hasAttributionValue = (attribution: RumVitalAttribution): boolean =>
  Boolean(
    attribution.lcpElement ||
      attribution.lcpUrl ||
      attribution.inpTarget ||
      attribution.clsSource ||
      attribution.lcpTtfb != null ||
      attribution.lcpResourceLoadDelay != null ||
      attribution.lcpResourceLoadDuration != null ||
      attribution.lcpElementRenderDelay != null ||
      attribution.inpInputDelay != null ||
      attribution.inpProcessing != null ||
      attribution.inpPresentation != null
  );

const WhySlow = ({ attribution }: { attribution: RumVitalAttribution }) => {
  if (!hasAttributionValue(attribution)) {
    return null;
  }

  const items: Array<{ title: string; description: NonNullable<React.ReactNode> }> = [];
  if (attribution.lcpElement) {
    items.push({
      title: i18n.translate('xpack.ux.pages.why.lcpElement', { defaultMessage: 'LCP element' }),
      description: truncateDetail(attribution.lcpElement),
    });
  }
  if (attribution.lcpUrl) {
    items.push({
      title: i18n.translate('xpack.ux.pages.why.lcpUrl', { defaultMessage: 'LCP resource' }),
      description: (
        <EuiToolTip content={attribution.lcpUrl}>
          <span tabIndex={0}>{resourceFileName(attribution.lcpUrl)}</span>
        </EuiToolTip>
      ),
    });
  }
  if (
    attribution.lcpTtfb != null ||
    attribution.lcpResourceLoadDelay != null ||
    attribution.lcpResourceLoadDuration != null ||
    attribution.lcpElementRenderDelay != null
  ) {
    items.push({
      title: i18n.translate('xpack.ux.pages.why.lcpParts', { defaultMessage: 'LCP sub-parts' }),
      description: i18n.translate('xpack.ux.pages.why.lcpPartsValue', {
        defaultMessage: 'TTFB {ttfb} · delay {delay} · download {download} · render {render}',
        values: {
          ttfb: formatMs(attribution.lcpTtfb),
          delay: formatMs(attribution.lcpResourceLoadDelay),
          download: formatMs(attribution.lcpResourceLoadDuration),
          render: formatMs(attribution.lcpElementRenderDelay),
        },
      }),
    });
  }
  if (attribution.inpTarget) {
    items.push({
      title: i18n.translate('xpack.ux.pages.why.inp', { defaultMessage: 'INP target' }),
      description: truncateDetail(
        `${attribution.inpTarget} (${attribution.inpType ?? 'interaction'})`
      ),
    });
  }
  if (
    attribution.inpInputDelay != null ||
    attribution.inpProcessing != null ||
    attribution.inpPresentation != null
  ) {
    items.push({
      title: i18n.translate('xpack.ux.pages.why.inpParts', { defaultMessage: 'INP breakdown' }),
      description: i18n.translate('xpack.ux.pages.why.inpPartsValue', {
        defaultMessage: 'input {input} · processing {processing} · presentation {presentation}',
        values: {
          input: formatMs(attribution.inpInputDelay),
          processing: formatMs(attribution.inpProcessing),
          presentation: formatMs(attribution.inpPresentation),
        },
      }),
    });
  }
  if (attribution.clsSource) {
    items.push({
      title: i18n.translate('xpack.ux.pages.why.cls', { defaultMessage: 'CLS source' }),
      description: truncateDetail(attribution.clsSource),
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.ux.pages.why.title', {
            defaultMessage: 'Why is this slow',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList type="column" compressed listItems={items} />
    </>
  );
};

const RESOURCE_PHASES: Array<{
  key: keyof Pick<
    RumResourceRow,
    'queueMs' | 'dnsMs' | 'tcpMs' | 'tlsMs' | 'requestMs' | 'responseMs'
  >;
  label: string;
}> = [
  {
    key: 'queueMs',
    label: i18n.translate('xpack.ux.pages.resources.queue', { defaultMessage: 'Queue' }),
  },
  {
    key: 'dnsMs',
    label: i18n.translate('xpack.ux.pages.resources.dns', { defaultMessage: 'DNS' }),
  },
  {
    key: 'tcpMs',
    label: i18n.translate('xpack.ux.pages.resources.tcp', { defaultMessage: 'TCP' }),
  },
  {
    key: 'tlsMs',
    label: i18n.translate('xpack.ux.pages.resources.tls', { defaultMessage: 'TLS' }),
  },
  {
    key: 'requestMs',
    label: i18n.translate('xpack.ux.pages.resources.request', { defaultMessage: 'Request' }),
  },
  {
    key: 'responseMs',
    label: i18n.translate('xpack.ux.pages.resources.response', { defaultMessage: 'Response' }),
  },
];

const resourcePhaseMs = (resource: RumResourceRow): number[] =>
  RESOURCE_PHASES.map(({ key }) => resource[key] ?? 0);

const ResourcePanel = ({ resources }: { resources: RumResourceRow[] }) => {
  const { euiTheme } = useEuiTheme();
  const colors = euiPaletteColorBlind();

  if (resources.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.ux.pages.resources.empty', {
          defaultMessage: 'No resource-timing spans for this page yet.',
        })}
      </EuiText>
    );
  }

  const scaleMs = Math.max(
    1,
    ...resources.map((resource) => {
      const phaseTotal = resourcePhaseMs(resource).reduce((sum, ms) => sum + ms, 0);
      return Math.max(resource.avgDurationMs ?? 0, phaseTotal);
    })
  );
  const rows = resources.slice(0, 8);

  return (
    <>
      {rows.map((resource) => {
        const phases = RESOURCE_PHASES.map((phase, index) => ({
          ...phase,
          ms: resource[phase.key] ?? 0,
          color: colors[index],
        })).filter((phase) => phase.ms > 0);
        const totalMs = phases.reduce((sum, phase) => sum + phase.ms, 0);
        const usedPct = Math.min(
          100,
          (Math.max(totalMs, resource.avgDurationMs ?? 0) / scaleMs) * 100
        );
        const fileName = resourceFileName(resource.url);

        return (
          <div
            key={resource.url}
            css={css`
              margin-bottom: ${euiTheme.size.m};
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
              <EuiFlexItem grow>
                <EuiToolTip content={resource.url}>
                  <EuiText
                    size="s"
                    tabIndex={0}
                    css={css`
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      font-family: ${euiTheme.font.familyCode};
                    `}
                  >
                    <strong>{fileName}</strong>
                    {resource.renderBlocking === 'blocking'
                      ? ` · ${i18n.translate('xpack.ux.pages.resources.blocking', {
                          defaultMessage: 'render-blocking',
                        })}`
                      : ''}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {formatMs(resource.avgDurationMs)}
                  {resource.status != null ? ` · ${resource.status}` : ''}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div
              css={css`
                display: flex;
                height: 8px;
                margin-top: ${euiTheme.size.xs};
                border-radius: ${euiTheme.border.radius.small};
                overflow: hidden;
                background: ${euiTheme.colors.lightestShade};
              `}
              role="img"
              aria-label={i18n.translate('xpack.ux.pages.resources.barAria', {
                defaultMessage: '{name} {duration}',
                values: { name: fileName, duration: formatMs(resource.avgDurationMs) },
              })}
            >
              <div
                css={css`
                  display: flex;
                  width: ${usedPct}%;
                  min-width: ${usedPct > 0 ? '4px' : 0};
                  height: 100%;
                `}
              >
                {phases.map((phase) => (
                  <div
                    key={phase.key}
                    title={`${phase.label}: ${formatMs(phase.ms)}`}
                    css={css`
                      width: ${totalMs > 0 ? (phase.ms / totalMs) * 100 : 0}%;
                      min-width: 2px;
                      height: 100%;
                      background: ${phase.color};
                    `}
                  />
                ))}
              </div>
            </div>
            {phases.length > 0 && (
              <EuiText size="xs" color="subdued" css={{ marginTop: 4 }}>
                {phases.map((phase) => `${phase.label} ${formatMs(phase.ms)}`).join(' · ')}
              </EuiText>
            )}
          </div>
        );
      })}
    </>
  );
};

export function RumPagesPanel() {
  const { http } = useKibanaServices();
  const history = useHistory();
  const {
    rangeId,
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      pageUrl,
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

  const [pages, setPages] = useState<RumPageRow[]>([]);
  const [kpis, setKpis] = useState<RumPagesKpis>(emptyPagesKpis());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useRumPageLoading('pages', loading);
  const [selected, setSelected] = useState<RumPageRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [backendCalls, setBackendCalls] = useState<RumBackendCall[]>([]);
  const [traceTarget, setTraceTarget] = useState<TraceFlyoutTarget | null>(null);
  const { items: budgets } = useRumBudgets();

  const load = useCallback(async () => {
    void rangeId;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumPages({
        http,
        rangeFrom,
        rangeTo,
        serviceName: typeof serviceName === 'string' ? serviceName : undefined,
        browser,
        os,
        pageUrl,
        user,
        includeBots,
        botUa,
        kuery,
        breakpoint,
        connection,
        device,
        analyticsMode,
      });
      setPages(result.pages);
      setKpis(result.kpis ?? emptyPagesKpis());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPages([]);
      setKpis(emptyPagesKpis());
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

  const autoOpenedPageUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!pageUrl || pages.length === 0 || autoOpenedPageUrl.current === pageUrl) {
      return;
    }
    const match = pages.find((page) => page.path === pageUrl);
    if (!match) {
      return;
    }
    autoOpenedPageUrl.current = pageUrl;
    setSelected(match);
  }, [pageUrl, pages]);

  const selectedPath = selected?.path;

  useEffect(() => {
    if (!selectedPath) {
      setBackendCalls([]);
      return;
    }
    const path = selectedPath;
    let cancelled = false;
    setDetailLoading(true);
    setBackendCalls([]);
    void fetchRumPageDetail({
      http,
      rangeFrom,
      rangeTo,
      serviceName: typeof serviceName === 'string' ? serviceName : undefined,
      browser,
      os,
      pageUrl: path,
      user,
      includeBots,
      botUa,
      kuery,
      breakpoint,
      connection,
      device,
      analyticsMode,
    })
      .then((detail) => {
        if (cancelled) {
          return;
        }
        setBackendCalls(detail.backendCalls ?? []);
        setSelected((current) => {
          if (!current || current.path !== path) {
            return current;
          }
          const hasAttribution =
            Boolean(detail.attribution.lcpElement) ||
            Boolean(detail.attribution.inpTarget) ||
            Boolean(detail.attribution.clsSource);
          return {
            ...current,
            attribution: hasAttribution ? detail.attribution : current.attribution,
            resources: detail.resources.length > 0 ? detail.resources : current.resources,
          };
        });
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedPath,
    http,
    rangeFrom,
    rangeTo,
    serviceName,
    browser,
    os,
    user,
    includeBots,
    botUa,
    kuery,
    breakpoint,
    connection,
    device,
    analyticsMode,
  ]);

  const columns: Array<EuiBasicTableColumn<RumPageRow>> = [
    {
      field: 'path',
      name: i18n.translate('xpack.ux.pages.table.path', { defaultMessage: 'Page' }),
      render: (path: string, item) => (
        <EuiButtonEmpty
          data-test-subj="uxColumnsButton"
          flush="left"
          onClick={() => setSelected(item)}
        >
          {displayPagePath(path)}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'views',
      name: i18n.translate('xpack.ux.pages.table.views', { defaultMessage: 'Views' }),
      width: '80px',
    },
    {
      field: 'trend',
      name: i18n.translate('xpack.ux.pages.table.trendLabel', { defaultMessage: 'Trend' }),
      width: '90px',
      render: (trend: number[]) => (
        <Sparkline buckets={trend.map((count) => ({ count, hasError: false }))} />
      ),
    },
    {
      field: 'avgDurationMs',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.pages.table.duration', { defaultMessage: 'Avg load' })}
          tooltip={AVG_LOAD_HELP}
        />
      ),
      width: '110px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Lcp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.pages.table.lcp', { defaultMessage: 'LCP p75' })}
          tooltip={VITAL_P75_HELP.lcp}
        />
      ),
      width: '140px',
      render: (value: number | null) => <VitalCell vital="lcp" value={value} format={formatMs} />,
    },
    {
      field: 'p75Inp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.pages.table.inp', { defaultMessage: 'INP p75' })}
          tooltip={VITAL_P75_HELP.inp}
        />
      ),
      width: '130px',
      render: (value: number | null) => <VitalCell vital="inp" value={value} format={formatMs} />,
    },
    {
      field: 'p75Cls',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.pages.table.cls', { defaultMessage: 'CLS p75' })}
          tooltip={VITAL_P75_HELP.cls}
        />
      ),
      width: '120px',
      render: (value: number | null) => (
        <VitalCell
          vital="cls"
          value={value}
          format={(next) => (next == null ? '—' : next.toFixed(3))}
        />
      ),
    },
    {
      name: i18n.translate('xpack.ux.pages.table.frustrationLabel', {
        defaultMessage: 'Frustration',
      }),
      width: '150px',
      render: (item: RumPageRow) =>
        item.rageClicks === 0 && item.deadClicks === 0 ? (
          <EuiText size="xs" color="subdued">
            —
          </EuiText>
        ) : (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {item.rageClicks > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="warning"
                  onClick={() =>
                    pushRumPath(
                      history,
                      '/session-replay',
                      sessionsPatch({ pageUrl: item.path, frustration: 'rage' })
                    )
                  }
                  onClickAriaLabel={i18n.translate('xpack.ux.pages.rageAriaLabel', {
                    defaultMessage: 'View rage-click sessions on {path}',
                    values: { path: displayPagePath(item.path) },
                  })}
                >
                  {i18n.translate('xpack.ux.pages.rageBadge', {
                    defaultMessage: '{count} rage',
                    values: { count: item.rageClicks },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {item.deadClicks > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="hollow"
                  onClick={() =>
                    pushRumPath(
                      history,
                      '/session-replay',
                      sessionsPatch({ pageUrl: item.path, frustration: 'dead' })
                    )
                  }
                  onClickAriaLabel={i18n.translate('xpack.ux.pages.deadAriaLabel', {
                    defaultMessage: 'View dead-click sessions on {path}',
                    values: { path: displayPagePath(item.path) },
                  })}
                >
                  {i18n.translate('xpack.ux.pages.deadBadge', {
                    defaultMessage: '{count} dead',
                    values: { count: item.deadClicks },
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
    },
    {
      name: i18n.translate('xpack.ux.pages.table.errorRateLabel', { defaultMessage: 'Error rate' }),
      width: '110px',
      render: (item: RumPageRow) => {
        const rate = item.views > 0 ? item.errorCount / item.views : 0;
        return (
          <EuiLink
            data-test-subj="uxPagesErrorRateLink"
            onClick={() => pushRumPath(history, '/errors', { pageUrl: item.path })}
          >
            <EuiText size="s" color={rate >= ERROR_RATE_WARN ? 'danger' : undefined}>
              {item.errorCount} · {percent(rate)}
            </EuiText>
          </EuiLink>
        );
      },
    },
    {
      name: i18n.translate('xpack.ux.pages.table.budgetsLabel', { defaultMessage: 'Budgets' }),
      width: '180px',
      render: (item: RumPageRow) => (
        <BudgetChips items={budgets} pagePath={item.path} includeAppWide={false} />
      ),
    },
    {
      name: i18n.translate('xpack.ux.pages.table.actions', { defaultMessage: 'Actions' }),
      width: '80px',
      actions: [
        {
          name: i18n.translate('xpack.ux.pages.table.sessions', { defaultMessage: 'Sessions' }),
          description: i18n.translate('xpack.ux.pages.table.sessionsDescription', {
            defaultMessage: 'View sessions on this page',
          }),
          icon: 'users',
          type: 'icon',
          onClick: (item) =>
            pushRumPath(history, '/session-replay', sessionsPatch({ pageUrl: item.path })),
        },
      ],
    },
  ];

  return (
    <>
      <PagesKpiStrip kpis={kpis} />
      <EuiSpacer />
      <TabTrendChart accessor="pageViews" />
      <EuiSpacer />
      <EuiPanel paddingSize="m" data-test-subj="uxRumPagesPanel">
        <EuiTitle size="xs">
          <h2>{i18n.translate('xpack.ux.pages.title', { defaultMessage: 'Pages' })}</h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.pages.description', {
              defaultMessage:
                'Routes grouped from documentLoad spans and browser.navigation events. Web vitals are p75 with good / needs-improvement / poor thresholds.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        {error && (
          <>
            <EuiCallOut
              announceOnMount
              color="danger"
              title={i18n.translate('xpack.ux.pages.errorTitle', {
                defaultMessage: 'Unable to load pages',
              })}
            >
              <p>{error}</p>
              <EuiButton
                data-test-subj="uxRumPagesPanelRetryButton"
                color="danger"
                onClick={() => void load()}
              >
                {i18n.translate('xpack.ux.pages.retry', { defaultMessage: 'Retry' })}
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {loading && pages.length === 0 ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.pages.tableCaption', {
              defaultMessage: 'Pages grouped by URL path',
            })}
            items={pages}
            columns={columns}
            loading={loading}
            noItemsMessage={i18n.translate('xpack.ux.pages.empty', {
              defaultMessage: 'No pages in this range',
            })}
          />
        )}

        {selected && (
          <EuiFlyout
            {...uxFlyoutProps({ title: displayPagePath(selected.path), session: 'start' })}
            onClose={() => {
              setTraceTarget(null);
              setSelected(null);
            }}
            aria-labelledby="uxPageDetailTitle"
            data-test-subj="uxPageDetailFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
                <EuiFlexItem grow>
                  <EuiTitle size="s">
                    <h2 id="uxPageDetailTitle">{displayPagePath(selected.path)}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SyntheticsMonitorChip
                    pagePath={selected.path}
                    showCreateCheck={
                      rateVital('lcp', selected.p75Lcp) === 'poor' ||
                      rateVital('inp', selected.p75Inp) === 'poor' ||
                      rateVital('cls', selected.p75Cls) === 'poor' ||
                      (selected.views > 0 &&
                        selected.errorCount / selected.views >= ERROR_RATE_WARN)
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiFlexGroup gutterSize="l" wrap responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={selected.views}
                    description={i18n.translate('xpack.ux.pages.detail.views', {
                      defaultMessage: 'Views',
                    })}
                    titleSize="s"
                    textAlign="left"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={selected.sessionCount}
                    description={i18n.translate('xpack.ux.pages.detail.sessionsLabel', {
                      defaultMessage: 'Sessions',
                    })}
                    titleSize="s"
                    textAlign="left"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={selected.errorCount}
                    description={i18n.translate('xpack.ux.pages.detail.errors', {
                      defaultMessage: 'Errors',
                    })}
                    titleSize="s"
                    textAlign="left"
                    titleColor={selected.errorCount > 0 ? 'danger' : undefined}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={formatMs(selected.avgDurationMs)}
                    description={
                      <VitalHelpLabel
                        label={i18n.translate('xpack.ux.pages.detail.load', {
                          defaultMessage: 'Avg load',
                        })}
                        tooltip={AVG_LOAD_HELP}
                      />
                    }
                    titleSize="s"
                    textAlign="left"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.ux.pages.detail.vitals', {
                    defaultMessage: 'Core Web Vitals',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {selected.p75Lcp == null && selected.p75Inp == null && selected.p75Cls == null ? (
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.ux.pages.detail.vitalsEmpty', {
                    defaultMessage: 'No web vitals for this page yet.',
                  })}
                </EuiText>
              ) : (
                <EuiFlexGroup gutterSize="l" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <VitalHelpLabel
                        label={i18n.translate('xpack.ux.pages.detail.lcp', {
                          defaultMessage: 'LCP p75',
                        })}
                        tooltip={VITAL_P75_HELP.lcp}
                      />
                    </EuiText>
                    <VitalCell vital="lcp" value={selected.p75Lcp} format={formatMs} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <VitalHelpLabel
                        label={i18n.translate('xpack.ux.pages.detail.inp', {
                          defaultMessage: 'INP p75',
                        })}
                        tooltip={VITAL_P75_HELP.inp}
                      />
                    </EuiText>
                    <VitalCell vital="inp" value={selected.p75Inp} format={formatMs} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <VitalHelpLabel
                        label={i18n.translate('xpack.ux.pages.detail.cls', {
                          defaultMessage: 'CLS p75',
                        })}
                        tooltip={VITAL_P75_HELP.cls}
                      />
                    </EuiText>
                    <VitalCell
                      vital="cls"
                      value={selected.p75Cls}
                      format={(next) => (next == null ? '—' : next.toFixed(3))}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
              {detailLoading ? (
                <>
                  <EuiSpacer />
                  <EuiLoadingSpinner size="m" />
                </>
              ) : (
                <>
                  {hasAttributionValue(selected.attribution) && (
                    <>
                      <EuiSpacer />
                      <WhySlow attribution={selected.attribution} />
                    </>
                  )}
                  <EuiSpacer />
                  <EuiTitle size="xxs">
                    <h3>
                      {i18n.translate('xpack.ux.pages.resources.title', {
                        defaultMessage: 'Slowest resources',
                      })}
                    </h3>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                  <ResourcePanel resources={selected.resources} />
                  <EuiSpacer />
                  <BackendCallsPanel
                    calls={backendCalls}
                    rangeFrom={rangeFrom}
                    rangeTo={rangeTo}
                    onViewTrace={setTraceTarget}
                  />
                </>
              )}
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiButton
                data-test-subj="uxRumPagesPanelViewSessionsOnThisPageButton"
                fill
                onClick={() =>
                  pushRumPath(history, '/session-replay', sessionsPatch({ pageUrl: selected.path }))
                }
              >
                {i18n.translate('xpack.ux.pages.detail.viewSessions', {
                  defaultMessage: 'View sessions on this page',
                })}
              </EuiButton>
            </EuiFlyoutFooter>
            {traceTarget && (
              <TraceWaterfallFlyout
                session="inherit"
                target={traceTarget}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                onClose={() => setTraceTarget(null)}
              />
            )}
          </EuiFlyout>
        )}
      </EuiPanel>
    </>
  );
}
