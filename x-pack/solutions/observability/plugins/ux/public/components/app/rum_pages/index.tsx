/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import {
  emptyPagesKpis,
  rateVital,
  type RumPageRow,
  type RumPagesKpis,
  type RumResourceRow,
  type RumVitalAttribution,
  type RumVitalRating,
} from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumPageDetail, fetchRumPages } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { Sparkline } from '../../session_replay/session_ui';
import { TabTrendChart } from '../rum_overview/tab_trend_chart';
import { BudgetChips } from '../rum_budgets/budget_chips';
import { useRumBudgets } from '../rum_budgets/use_rum_budgets';
import { useRumPageLoading } from '../rum_dashboard/rum_page_loading';

const ERROR_RATE_WARN = 0.05;

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const percent = (ratio: number | null): string =>
  ratio == null ? '—' : `${Math.round(ratio * 1000) / 10}%`;

const dash = (value: string | number | null | undefined): string => {
  if (value == null || value === '') {
    return '—';
  }
  return String(value);
};

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
  const items: Array<{ title: string; description: string }> = [
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
      description: i18n.translate('xpack.ux.pages.kpi.passingCwvLabel', {
        defaultMessage: 'Views passing CWV',
      }),
    },
    {
      title: String(kpis.poorLcpPages),
      description: i18n.translate('xpack.ux.pages.kpi.poorLcpLabel', {
        defaultMessage: 'Pages with poor LCP',
      }),
    },
  ];

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" data-test-subj="uxRumPagesKpis">
      <EuiFlexGroup responsive={false} gutterSize="l" wrap>
        {items.map((item) => (
          <EuiFlexItem grow={false} key={item.description}>
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

const WhySlow = ({ attribution }: { attribution: RumVitalAttribution }) => {
  const items = [
    {
      title: i18n.translate('xpack.ux.pages.why.lcpElement', { defaultMessage: 'LCP element' }),
      description: dash(attribution.lcpElement),
    },
    {
      title: i18n.translate('xpack.ux.pages.why.lcpUrl', { defaultMessage: 'LCP resource' }),
      description: dash(attribution.lcpUrl),
    },
    {
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
    },
    {
      title: i18n.translate('xpack.ux.pages.why.inp', { defaultMessage: 'INP target' }),
      description: attribution.inpTarget
        ? `${attribution.inpTarget} (${attribution.inpType ?? 'interaction'})`
        : '—',
    },
    {
      title: i18n.translate('xpack.ux.pages.why.inpParts', { defaultMessage: 'INP breakdown' }),
      description: i18n.translate('xpack.ux.pages.why.inpPartsValue', {
        defaultMessage: 'input {input} · processing {processing} · presentation {presentation}',
        values: {
          input: formatMs(attribution.inpInputDelay),
          processing: formatMs(attribution.inpProcessing),
          presentation: formatMs(attribution.inpPresentation),
        },
      }),
    },
    {
      title: i18n.translate('xpack.ux.pages.why.cls', { defaultMessage: 'CLS source' }),
      description: dash(attribution.clsSource),
    },
  ];
  return <EuiDescriptionList listItems={items} />;
};

const PhaseBar = ({ label, ms, max }: { label: string; ms: number | null; max: number }) => (
  <div
    css={css`
      margin-bottom: 4px;
    `}
  >
    <EuiText size="xs">
      {label}: {formatMs(ms)}
    </EuiText>
    <EuiProgress
      value={ms ?? 0}
      max={Math.max(max, 1)}
      size="s"
      color="primary"
      aria-label={label}
    />
  </div>
);

const ResourcePanel = ({ resources }: { resources: RumResourceRow[] }) => {
  if (resources.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.ux.pages.resources.empty', {
          defaultMessage: 'No resource-timing spans for this page yet.',
        })}
      </EuiText>
    );
  }
  return (
    <>
      {resources.map((resource) => {
        const phases = [
          resource.queueMs,
          resource.dnsMs,
          resource.tcpMs,
          resource.tlsMs,
          resource.requestMs,
          resource.responseMs,
        ];
        const max = Math.max(1, ...phases.map((v) => v ?? 0));
        return (
          <div key={resource.url} css={{ marginBottom: 12 }}>
            <EuiText size="s">
              <strong>{resource.url}</strong>
              {resource.renderBlocking === 'blocking'
                ? ` · ${i18n.translate('xpack.ux.pages.resources.blocking', {
                    defaultMessage: 'render-blocking',
                  })}`
                : ''}
            </EuiText>
            <EuiText size="xs" color="subdued">
              {formatMs(resource.avgDurationMs)}
              {resource.status != null ? ` · ${resource.status}` : ''}
            </EuiText>
            <PhaseBar
              label={i18n.translate('xpack.ux.pages.resources.queue', { defaultMessage: 'Queue' })}
              ms={resource.queueMs}
              max={max}
            />
            <PhaseBar
              label={i18n.translate('xpack.ux.pages.resources.dns', { defaultMessage: 'DNS' })}
              ms={resource.dnsMs}
              max={max}
            />
            <PhaseBar
              label={i18n.translate('xpack.ux.pages.resources.tcp', { defaultMessage: 'TCP' })}
              ms={resource.tcpMs}
              max={max}
            />
            <PhaseBar
              label={i18n.translate('xpack.ux.pages.resources.request', {
                defaultMessage: 'Request',
              })}
              ms={resource.requestMs}
              max={max}
            />
            <PhaseBar
              label={i18n.translate('xpack.ux.pages.resources.response', {
                defaultMessage: 'Response',
              })}
              ms={resource.responseMs}
              max={max}
            />
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
    urlParams: {
      rangeFrom = 'now-24h',
      rangeTo = 'now',
      serviceName,
      browser,
      os,
      pageUrl,
      user,
      includeBots,
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
  const { items: budgets } = useRumBudgets();

  const load = useCallback(async () => {
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
    kuery,
    breakpoint,
    connection,
    device,
    analyticsMode,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPath = selected?.path;

  useEffect(() => {
    if (!selectedPath) {
      return;
    }
    const path = selectedPath;
    let cancelled = false;
    setDetailLoading(true);
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
          {path}
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
      name: i18n.translate('xpack.ux.pages.table.duration', { defaultMessage: 'Avg load' }),
      width: '100px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Lcp',
      name: i18n.translate('xpack.ux.pages.table.lcp', { defaultMessage: 'LCP p75' }),
      width: '130px',
      render: (value: number | null) => <VitalCell vital="lcp" value={value} format={formatMs} />,
    },
    {
      field: 'p75Inp',
      name: i18n.translate('xpack.ux.pages.table.inp', { defaultMessage: 'INP p75' }),
      width: '120px',
      render: (value: number | null) => <VitalCell vital="inp" value={value} format={formatMs} />,
    },
    {
      field: 'p75Cls',
      name: i18n.translate('xpack.ux.pages.table.cls', { defaultMessage: 'CLS p75' }),
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
                    values: { path: item.path },
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
                    values: { path: item.path },
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
          <EuiFlyout size="m" onClose={() => setSelected(null)} aria-labelledby="uxPageDetailTitle">
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id="uxPageDetailTitle">{selected.path}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiDescriptionList
                listItems={[
                  {
                    title: i18n.translate('xpack.ux.pages.detail.views', {
                      defaultMessage: 'Views',
                    }),
                    description: String(selected.views),
                  },
                  {
                    title: i18n.translate('xpack.ux.pages.detail.sessionsLabel', {
                      defaultMessage: 'Sessions',
                    }),
                    description: String(selected.sessionCount),
                  },
                  {
                    title: i18n.translate('xpack.ux.pages.detail.errors', {
                      defaultMessage: 'Errors',
                    }),
                    description: String(selected.errorCount),
                  },
                  {
                    title: i18n.translate('xpack.ux.pages.detail.lcp', {
                      defaultMessage: 'LCP p75',
                    }),
                    description: formatMs(selected.p75Lcp),
                  },
                  {
                    title: i18n.translate('xpack.ux.pages.detail.inp', {
                      defaultMessage: 'INP p75',
                    }),
                    description: formatMs(selected.p75Inp),
                  },
                  {
                    title: i18n.translate('xpack.ux.pages.detail.cls', {
                      defaultMessage: 'CLS p75',
                    }),
                    description: selected.p75Cls == null ? '—' : selected.p75Cls.toFixed(3),
                  },
                  {
                    title: i18n.translate('xpack.ux.pages.detail.load', {
                      defaultMessage: 'Avg load',
                    }),
                    description: formatMs(selected.avgDurationMs),
                  },
                ]}
              />
              <EuiSpacer />
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.ux.pages.why.title', {
                    defaultMessage: 'Why is this slow',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              {detailLoading ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                <WhySlow attribution={selected.attribution} />
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
              {detailLoading ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                <ResourcePanel resources={selected.resources} />
              )}
              <EuiSpacer />
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
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </EuiPanel>
    </>
  );
}
