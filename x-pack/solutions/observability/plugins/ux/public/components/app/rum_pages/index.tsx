/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
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
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumPageRow, RumResourceRow, RumVitalAttribution } from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumPages } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { TabTrendChart } from '../rum_overview/tab_trend_chart';

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const dash = (value: string | number | null | undefined): string => {
  if (value == null || value === '') {
    return '—';
  }
  return String(value);
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
    },
  } = useLegacyUrlParams();

  const [pages, setPages] = useState<RumPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RumPageRow | null>(null);

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
      });
      setPages(result.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPages([]);
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
  ]);

  useEffect(() => {
    void load();
  }, [load]);

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
      width: '100px',
    },
    {
      field: 'avgDurationMs',
      name: i18n.translate('xpack.ux.pages.table.duration', { defaultMessage: 'Avg load' }),
      width: '110px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Lcp',
      name: i18n.translate('xpack.ux.pages.table.lcp', { defaultMessage: 'LCP p75' }),
      width: '100px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Inp',
      name: i18n.translate('xpack.ux.pages.table.inp', { defaultMessage: 'INP p75' }),
      width: '100px',
      render: (value: number | null) => formatMs(value),
    },
    {
      field: 'p75Cls',
      name: i18n.translate('xpack.ux.pages.table.cls', { defaultMessage: 'CLS p75' }),
      width: '100px',
      render: (value: number | null) => (value == null ? '—' : value.toFixed(3)),
    },
    {
      field: 'errorCount',
      name: i18n.translate('xpack.ux.pages.table.errors', { defaultMessage: 'Errors' }),
      width: '90px',
    },
    {
      name: i18n.translate('xpack.ux.pages.table.actions', { defaultMessage: 'Actions' }),
      width: '140px',
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
              'Routes grouped from documentLoad spans and browser.navigation events. Open a row for vitals, or jump to the sessions that hit that page.',
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
                  title: i18n.translate('xpack.ux.pages.detail.views', { defaultMessage: 'Views' }),
                  description: String(selected.views),
                },
                {
                  title: i18n.translate('xpack.ux.pages.detail.errors', {
                    defaultMessage: 'Errors',
                  }),
                  description: String(selected.errorCount),
                },
                {
                  title: i18n.translate('xpack.ux.pages.detail.lcp', { defaultMessage: 'LCP p75' }),
                  description: formatMs(selected.p75Lcp),
                },
                {
                  title: i18n.translate('xpack.ux.pages.detail.inp', { defaultMessage: 'INP p75' }),
                  description: formatMs(selected.p75Inp),
                },
                {
                  title: i18n.translate('xpack.ux.pages.detail.cls', { defaultMessage: 'CLS p75' }),
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
                {i18n.translate('xpack.ux.pages.why.title', { defaultMessage: 'Why is this slow' })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <WhySlow attribution={selected.attribution} />
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
