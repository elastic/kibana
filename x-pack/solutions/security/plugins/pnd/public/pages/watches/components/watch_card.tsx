/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import { AutonomyMeter } from './autonomy_meter';
import { RunSparkline } from './run_sparkline';
import * as i18n from '../translations';

const ICON_MAP: Record<string, IconType> = {
  alert: 'warning',
  bell: 'bell',
  bolt: 'bolt',
  console: 'console',
  sparkles: 'starEmpty',
};

interface WatchCardProps {
  watch: Watch;
  onSelect: (watchId: string) => void;
}

export const WatchCard: React.FC<WatchCardProps> = ({ watch, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const iconType = ICON_MAP[watch.icon] ?? 'eye';
  const hasMetrics = watch.metrics.runs7d != null;

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      onClick={() => onSelect(watch.id)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(watch.id);
        }
      }}
      role="button"
      tabIndex={0}
      css={css`
        text-align: left;
        cursor: pointer;
        opacity: ${watch.enabled || watch.draft ? 1 : 0.65};
        border-top: 3px solid ${watch.color};
        transition: box-shadow ${euiTheme.animation.fast} ease;
        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
      `}
      aria-label={watch.name}
    >
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                css={css`
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  border-radius: ${euiTheme.border.radius.medium};
                  color: ${watch.color};
                  background: color-mix(in srgb, ${watch.color} 14%, transparent);
                `}
              >
                <EuiIcon type={iconType} size="m" />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{watch.name}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {watch.mandate}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {watch.draft ? (
            <EuiBadge color="hollow">{i18n.DRAFT_BADGE}</EuiBadge>
          ) : watch.enabled ? (
            <EuiText size="xs" color="subdued">
              {watch.metrics.lastRun ? i18n.lastRunLabel(watch.metrics.lastRun) : i18n.NEVER_RUN}
            </EuiText>
          ) : (
            <EuiBadge color="default">{i18n.PAUSED_BADGE}</EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${euiTheme.size.m};
          margin-top: ${euiTheme.size.m};
          opacity: ${hasMetrics ? 1 : 0.4};
        `}
      >
        <div>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <strong>{watch.metrics.runs7d ?? '—'}</strong>
              </EuiText>
            </EuiFlexItem>
            {hasMetrics ? (
              <EuiFlexItem grow={false}>
                <RunSparkline seed={watch.id} color={watch.color} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiText size="xs" color="subdued">
            {i18n.RUNS_7D}
          </EuiText>
        </div>
        <div>
          <EuiText size="m">
            <strong>
              {watch.metrics.acceptedPct != null ? `${watch.metrics.acceptedPct}%` : '—'}
            </strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.ACCEPTED}
          </EuiText>
        </div>
      </div>

      <div
        css={css`
          margin-top: ${euiTheme.size.m};
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          border-top: 1px solid ${euiTheme.colors.lightShade};
          padding-top: ${euiTheme.size.s};
        `}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.AUTONOMY}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AutonomyMeter level={watch.autonomyLevel} color={watch.color} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.DATA_SCOPE}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{watch.scopeSummary}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );
};
