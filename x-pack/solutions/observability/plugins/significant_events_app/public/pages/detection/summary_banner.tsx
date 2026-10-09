/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { EngineActivityPanel } from './engine_activity_panel';
import { engineDrawerLabels } from './engine_drawer';
import { MetricValue } from './metric_value';
import { RuleCoverage } from './rule_coverage';
import { labels } from './translations';

export interface SummaryMetric {
  label: string;
  value: number;
  hint: string;
  icon: IconType;
}

export const DetectionSummaryBanner = ({
  metrics,
  range,
  nextSteps,
  watchedSources,
  drawer,
  coverage,
  updatedAt,
  refreshing,
  onRefresh,
  onOpenEngine,
}: {
  metrics: SummaryMetric[];
  range: string;
  nextSteps: boolean;
  watchedSources?: number;
  drawer?: string;
  coverage: React.ComponentProps<typeof RuleCoverage>;
  updatedAt: string;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenEngine: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      data-test-subj="detectionSummaryBanner"
      css={css`
        background: linear-gradient(
          115deg,
          color-mix(in srgb, ${euiTheme.colors.primary} 5%, ${euiTheme.colors.backgroundBasePlain}),
          ${euiTheme.colors.backgroundBasePlain} 65%
        );
        border-color: color-mix(
          in srgb,
          ${euiTheme.colors.primary} 22%,
          ${euiTheme.colors.borderBasePlain}
        );
      `}
    >
      <div
        css={css`
          padding: 0 ${euiTheme.size.xs};
        `}
      >
        <EngineActivityPanel
          minimal={nextSteps}
          integrated
          title={i18n.translate('xpack.significantEventsApp.engineBar.title', {
            defaultMessage: 'Nightshift detection',
          })}
          onOpenActivity={onOpenEngine}
          headerAction={
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              {!nextSteps && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="inspect"
                    aria-haspopup="dialog"
                    aria-expanded={drawer === 'engine'}
                    onClick={onOpenEngine}
                    data-test-subj="detectionOpenEngineDrawer"
                  >
                    {engineDrawerLabels.title}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              {!nextSteps && (
                <EuiFlexItem grow={false}>
                  <span
                    css={css`
                      color: ${euiTheme.colors.textSubdued};
                      font-size: ${euiTheme.font.scale.xs}rem;
                      padding: 0 ${euiTheme.size.s};
                    `}
                  >
                    {i18n.translate('xpack.significantEventsApp.sources.watchedCount', {
                      defaultMessage: '{count} watched sources',
                      values: { count: watchedSources?.toLocaleString(i18n.getLocale()) ?? '—' },
                    })}
                  </span>
                </EuiFlexItem>
              )}
              {!nextSteps && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={`${labels.updated} ${updatedAt}`} disableScreenReaderOutput>
                    <EuiButtonIcon
                      size="s"
                      iconType="refresh"
                      aria-label={labels.refresh}
                      onClick={onRefresh}
                      isLoading={refreshing}
                      data-test-subj="detectionWorkspaceRefresh"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
      </div>
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr)) ${nextSteps
              ? ''
              : 'minmax(230px, 1.3fr)'};
          align-items: center;
          margin-top: ${euiTheme.size.s};
          padding: ${euiTheme.size.xs} 0;
          border: 1px solid color-mix(in srgb, ${euiTheme.colors.borderBasePlain} 65%, transparent);
          border-radius: ${euiTheme.border.radius.medium};
          background: color-mix(in srgb, ${euiTheme.colors.backgroundBasePlain} 65%, transparent);
          @media (max-width: 1100px) {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            row-gap: ${euiTheme.size.s};
          }
          @media (max-width: 650px) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        `}
      >
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            css={css`
              min-width: 0;
              padding: ${euiTheme.size.xs} ${euiTheme.size.m};
              border-left: ${index ? `1px solid ${euiTheme.colors.borderBasePlain}` : 'none'};
            `}
          >
            <EuiToolTip content={metric.hint} display="block">
              <div
                tabIndex={0}
                css={css`
                  display: flex;
                  gap: ${euiTheme.size.s};
                  align-items: center;
                  border-radius: ${euiTheme.border.radius.small};
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                  }
                `}
              >
                <span
                  aria-hidden={true}
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    flex: 0 0 28px;
                    border-radius: ${euiTheme.border.radius.medium};
                    color: ${euiTheme.colors.primary};
                    background: color-mix(in srgb, ${euiTheme.colors.primary} 8%, transparent);
                  `}
                >
                  <EuiIcon type={metric.icon} size="s" aria-hidden={true} />
                </span>
                <div
                  css={css`
                    min-width: 0;
                  `}
                >
                  <div
                    css={css`
                      display: flex;
                      align-items: baseline;
                      gap: ${euiTheme.size.xs};
                      color: ${euiTheme.colors.text};
                    `}
                  >
                    <MetricValue
                      key={`${range}:${metric.label}`}
                      metric={metric.label}
                      range={range}
                      value={metric.value}
                    />
                  </div>
                  <span
                    css={css`
                      display: block;
                      font-size: ${euiTheme.font.scale.xs}rem;
                      line-height: 1.4;
                      color: ${euiTheme.colors.textSubdued};
                    `}
                  >
                    {metric.label}
                  </span>
                </div>
              </div>
            </EuiToolTip>
          </div>
        ))}
        {!nextSteps && (
          <div
            css={css`
              padding: ${euiTheme.size.xs} ${euiTheme.size.m};
              border-left: 1px solid ${euiTheme.colors.borderBasePlain};
              @media (max-width: 650px) {
                grid-column: 1 / -1;
                border-left: none;
              }
            `}
          >
            <RuleCoverage {...coverage} />
          </div>
        )}
      </div>
    </EuiPanel>
  );
};
