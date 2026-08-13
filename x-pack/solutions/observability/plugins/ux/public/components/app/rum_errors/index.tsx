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
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { RumErrorGroup } from '../../../../common/rum_app';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumErrors } from '../../../services/rest/rum_api';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';

const MiniTrend = ({ values }: { values: number[] }) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(1, ...values);
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-end;
        gap: 1px;
        height: 24px;
        width: 72px;
      `}
    >
      {values.map((value, index) => (
        <div
          key={index}
          css={css`
            flex: 1;
            height: ${Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 24))}px;
            background: ${euiTheme.colors.danger};
            border-radius: 1px;
          `}
        />
      ))}
    </div>
  );
};

const ErrorDetailFlyout = ({
  group,
  apmHref,
  traceHref,
  onClose,
  onViewSessions,
}: {
  group: RumErrorGroup;
  apmHref: string | null;
  traceHref: string | null;
  onClose: () => void;
  onViewSessions: () => void;
}) => (
  <EuiFlyout size="m" onClose={onClose} aria-labelledby="uxErrorDetailTitle">
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2 id="uxErrorDetailTitle">{group.type}</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        {group.message}
      </EuiText>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiText size="s">
        {i18n.translate('xpack.ux.errors.detail.counts', {
          defaultMessage: '{count} events in {sessions} sessions ({users} users)',
          values: { count: group.count, sessions: group.sessionCount, users: group.userCount },
        })}
      </EuiText>
      {(group.sampleAction || group.samplePage) && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {group.sampleAction && group.samplePage
              ? i18n.translate('xpack.ux.errors.detail.context', {
                  defaultMessage: 'During {action} on {page}',
                  values: { action: group.sampleAction, page: group.samplePage },
                })
              : group.samplePage
              ? i18n.translate('xpack.ux.errors.detail.contextPage', {
                  defaultMessage: 'On {page}',
                  values: { page: group.samplePage },
                })
              : i18n.translate('xpack.ux.errors.detail.contextAction', {
                  defaultMessage: 'During {action}',
                  values: { action: group.sampleAction ?? '' },
                })}
          </EuiText>
        </>
      )}
      <EuiSpacer />
      {group.sampleStack && (
        <EuiCodeBlock language="text" isCopyable overflowHeight={280}>
          {group.sampleStack}
        </EuiCodeBlock>
      )}
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="uxRumErrorsPanelViewSessionsButton"
            fill
            onClick={onViewSessions}
          >
            {i18n.translate('xpack.ux.errors.detail.sessions', {
              defaultMessage: 'View sessions',
            })}
          </EuiButton>
        </EuiFlexItem>
        {apmHref && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxRumErrorsPanelOpenInApmButton"
              href={apmHref}
              target="_blank"
            >
              {i18n.translate('xpack.ux.errors.detail.apm', {
                defaultMessage: 'Open in APM',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
        {traceHref && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxRumErrorsPanelOpenTraceButton"
              href={traceHref}
              target="_blank"
            >
              {i18n.translate('xpack.ux.errors.detail.trace', {
                defaultMessage: 'Open trace',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyoutBody>
  </EuiFlyout>
);

export function RumErrorsPanel() {
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

  const [groups, setGroups] = useState<RumErrorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RumErrorGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumErrors({
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
      setGroups(result.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setGroups([]);
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

  const apmTraceHref = (group: RumErrorGroup): string | null => {
    if (!group.sampleTraceId) {
      return null;
    }
    return http.basePath.prepend(
      `/app/apm/link-to/trace/${encodeURIComponent(group.sampleTraceId)}`
    );
  };

  const apmErrorHref = (group: RumErrorGroup): string | null => {
    if (!serviceName || !group.groupingKey) {
      return null;
    }
    return http.basePath.prepend(
      `/app/apm/services/${encodeURIComponent(String(serviceName))}/errors/${encodeURIComponent(
        group.groupingKey
      )}`
    );
  };

  const columns: Array<EuiBasicTableColumn<RumErrorGroup>> = [
    {
      field: 'message',
      name: i18n.translate('xpack.ux.errors.table.error', { defaultMessage: 'Error' }),
      render: (_: string, item) => (
        <div>
          <EuiButtonEmpty
            data-test-subj="uxColumnsButton"
            flush="left"
            onClick={() => setSelected(item)}
          >
            {item.type}
          </EuiButtonEmpty>
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {item.message}
          </EuiText>
        </div>
      ),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.ux.errors.table.count', { defaultMessage: 'Events' }),
      width: '90px',
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.errors.table.sessions', { defaultMessage: 'Sessions' }),
      width: '100px',
    },
    {
      field: 'userCount',
      name: i18n.translate('xpack.ux.errors.table.users', { defaultMessage: 'Affected users' }),
      width: '130px',
    },
    {
      name: i18n.translate('xpack.ux.errors.table.context', { defaultMessage: 'Context' }),
      width: '180px',
      render: (item: RumErrorGroup) => (
        <EuiText size="xs" color="subdued" className="eui-textTruncate">
          {item.sampleAction && item.samplePage
            ? i18n.translate('xpack.ux.errors.table.contextBoth', {
                defaultMessage: '{action} · {page}',
                values: { action: item.sampleAction, page: item.samplePage },
              })
            : item.samplePage ||
              item.sampleAction ||
              i18n.translate('xpack.ux.errors.table.contextNone', { defaultMessage: '—' })}
        </EuiText>
      ),
    },
    {
      field: 'trend',
      name: i18n.translate('xpack.ux.errors.table.trend', { defaultMessage: 'Trend' }),
      width: '90px',
      render: (trend: number[]) => <MiniTrend values={trend} />,
    },
    {
      name: i18n.translate('xpack.ux.errors.table.actions', { defaultMessage: 'Actions' }),
      width: '160px',
      render: (item: RumErrorGroup) => {
        const apmHref = apmErrorHref(item);
        return (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.ux.errors.viewSessionsTip', {
                  defaultMessage: 'View sessions with this error',
                })}
              >
                <EuiButtonEmpty
                  data-test-subj="uxColumnsSessionsButton"
                  size="s"
                  onClick={() =>
                    pushRumPath(history, '/session-replay', sessionsPatch({ errorGroup: item.key }))
                  }
                >
                  {i18n.translate('xpack.ux.errors.viewSessions', { defaultMessage: 'Sessions' })}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            {apmHref && (
              <EuiFlexItem grow={false}>
                <EuiLink data-test-subj="uxColumnsApmLink" href={apmHref} target="_blank">
                  {i18n.translate('xpack.ux.errors.apm', { defaultMessage: 'APM' })}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
  ];

  return (
    <EuiPanel paddingSize="m" data-test-subj="uxRumErrorsPanel">
      <EuiTitle size="xs">
        <h2>{i18n.translate('xpack.ux.errors.title', { defaultMessage: 'Errors' })}</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ux.errors.description', {
            defaultMessage:
              'JavaScript exceptions grouped by type and message. Open a group to see a sample stack, or jump to the sessions (and APM, when a grouping key is present).',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {error && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('xpack.ux.errors.errorTitle', {
              defaultMessage: 'Unable to load errors',
            })}
          >
            <p>{error}</p>
            <EuiButton
              data-test-subj="uxRumErrorsPanelRetryButton"
              color="danger"
              onClick={() => void load()}
            >
              {i18n.translate('xpack.ux.errors.retry', { defaultMessage: 'Retry' })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}

      {loading && groups.length === 0 ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.errors.tableCaption', {
            defaultMessage: 'JavaScript error groups',
          })}
          items={groups}
          columns={columns}
          loading={loading}
          noItemsMessage={i18n.translate('xpack.ux.errors.empty', {
            defaultMessage: 'No exceptions in this range',
          })}
        />
      )}

      {selected && (
        <ErrorDetailFlyout
          group={selected}
          apmHref={apmErrorHref(selected)}
          traceHref={apmTraceHref(selected)}
          onClose={() => setSelected(null)}
          onViewSessions={() =>
            pushRumPath(history, '/session-replay', sessionsPatch({ errorGroup: selected.key }))
          }
        />
      )}
    </EuiPanel>
  );
}
