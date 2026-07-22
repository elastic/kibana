/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiText,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TopFailingMonitor } from '../../../../../../common/runtime_types';
import { useSyntheticsSettingsContext } from '../../../contexts';

type SortMode = 'errorRate' | 'totalErrors' | 'downtime';

const SORT_OPTIONS = [
  {
    id: 'totalErrors' as const,
    label: i18n.translate('xpack.synthetics.topFailing.byErrors', {
      defaultMessage: 'By errors',
    }),
  },
  {
    id: 'errorRate' as const,
    label: i18n.translate('xpack.synthetics.topFailing.byRate', {
      defaultMessage: 'By rate',
    }),
  },
  {
    id: 'downtime' as const,
    label: i18n.translate('xpack.synthetics.topFailing.byDowntime', {
      defaultMessage: 'By downtime',
    }),
  },
];

export const TopFailingMonitors = ({
  monitors,
  loading,
}: {
  monitors: TopFailingMonitor[];
  loading: boolean;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const { euiTheme } = useEuiTheme();
  const [sortMode, setSortMode] = useState<SortMode>('totalErrors');

  const sorted = useMemo(() => {
    const copy = [...monitors];
    if (sortMode === 'errorRate') {
      copy.sort((a, b) => b.errorRate - a.errorRate || b.downChecks - a.downChecks);
    } else if (sortMode === 'downtime') {
      copy.sort((a, b) => b.downtimeMs - a.downtimeMs || b.downChecks - a.downChecks);
    } else {
      copy.sort((a, b) => b.downChecks - a.downChecks || b.errorRate - a.errorRate);
    }
    return copy;
  }, [monitors, sortMode]);

  if (loading && !monitors.length) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiText size="xs">
          <h5>{TITLE}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSkeletonText lines={5} />
      </EuiPanel>
    );
  }

  if (!monitors.length) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiText size="xs">
          <h5>{TITLE}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {NO_FAILING_LABEL}
        </EuiText>
      </EuiPanel>
    );
  }

  const displayed = sorted.slice(0, 10);
  const maxDown = Math.max(...displayed.map((m) => m.downChecks));
  const maxDowntime = Math.max(...displayed.map((m) => m.downtimeMs));

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <h5>{TITLE}</h5>
              </EuiText>
            </EuiFlexItem>
            {monitors.length > 10 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {SHOWING_LABEL(10, monitors.length)}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={SORT_LEGEND}
            options={SORT_OPTIONS}
            idSelected={sortMode}
            onChange={(id) => setSortMode(id as SortMode)}
            buttonSize="compressed"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        css={css`
          display: grid;
          grid-template-columns: minmax(120px, auto) 1fr 50px;
          gap: ${euiTheme.size.xs} ${euiTheme.size.s};
          align-items: center;
          max-height: 320px;
          overflow-y: auto;
        `}
      >
        {displayed.map((monitor) => {
          const pct = (monitor.errorRate * 100).toFixed(0);
          const barWidthPct =
            sortMode === 'errorRate'
              ? monitor.errorRate * 100
              : sortMode === 'downtime'
              ? maxDowntime > 0
                ? (monitor.downtimeMs / maxDowntime) * 100
                : 0
              : maxDown > 0
              ? (monitor.downChecks / maxDown) * 100
              : 0;
          const barColor =
            monitor.errorRate >= 0.8
              ? euiTheme.colors.danger
              : monitor.errorRate >= 0.4
              ? euiTheme.colors.warning
              : euiTheme.colors.vis.euiColorVis0;

          return (
            <React.Fragment key={monitor.configId}>
              <EuiLink
                data-test-subj="syntheticsTopFailingMonitorsLink"
                href={`${basePath}/app/synthetics/monitor/${monitor.configId}`}
                className="eui-textTruncate"
                title={monitor.monitorName}
                css={css`
                  font-size: ${euiTheme.size.m};
                  max-width: 220px;
                `}
              >
                {monitor.monitorName}
              </EuiLink>

              <EuiToolTip
                content={`${monitor.downChecks} errors, ${pct}% failure, ${formatDowntime(
                  monitor.downtimeMs
                )} downtime`}
              >
                <div
                  css={css`
                    position: relative;
                    height: 20px;
                    background: ${euiTheme.colors.lightShade};
                    border-radius: ${euiTheme.border.radius.small};
                    overflow: hidden;
                  `}
                >
                  <div
                    css={css`
                      position: absolute;
                      top: 0;
                      left: 0;
                      height: 100%;
                      width: ${barWidthPct}%;
                      background: ${barColor};
                      border-radius: ${euiTheme.border.radius.small};
                      transition: width 0.3s ease;
                    `}
                  />
                  <EuiText
                    size="xs"
                    css={css`
                      position: absolute;
                      left: ${euiTheme.size.xs};
                      top: 50%;
                      transform: translateY(-50%);
                      font-weight: ${euiTheme.font.weight.medium};
                      color: ${barWidthPct > 30 ? '#fff' : euiTheme.colors.text};
                      line-height: 1;
                    `}
                  >
                    {sortMode === 'downtime'
                      ? formatDowntime(monitor.downtimeMs)
                      : monitor.downChecks}
                  </EuiText>
                </div>
              </EuiToolTip>

              <EuiText
                size="xs"
                css={css`
                  text-align: right;
                  font-weight: ${euiTheme.font.weight.semiBold};
                  color: ${barColor};
                  min-width: 50px;
                `}
              >
                {sortMode === 'downtime' ? formatDowntime(monitor.downtimeMs) : `${pct}%`}
              </EuiText>
            </React.Fragment>
          );
        })}
      </div>
    </EuiPanel>
  );
};

function formatDowntime(ms: number): string {
  if (!ms || isNaN(ms)) return '0s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

const TITLE = i18n.translate('xpack.synthetics.errors.topFailingMonitors', {
  defaultMessage: 'Top failing monitors',
});

const NO_FAILING_LABEL = i18n.translate('xpack.synthetics.errors.noFailingMonitors', {
  defaultMessage: 'No failing monitors in this period',
});

const SHOWING_LABEL = (shown: number, total: number) =>
  i18n.translate('xpack.synthetics.errors.showingTopMonitors', {
    defaultMessage: 'Top {shown} of {total}',
    values: { shown, total },
  });

const SORT_LEGEND = i18n.translate('xpack.synthetics.errors.topFailingSortMode', {
  defaultMessage: 'Sort monitors by',
});
