/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { Watch } from '@kbn/pnd-common';
import { isOnDutyNow } from '@kbn/pnd-common';
import * as i18n from '../translations';

interface CoverageStripProps {
  watches: Watch[];
  onSelectWatch: (watchId: string) => void;
}

const HOURS = ['00:00', '06:00', '12:00', '18:00', '24:00'];

const formatWindowLabel = (watch: Watch): string => {
  const { schedule, coverage } = watch;
  const alwaysOn = schedule.mode === 'always' || coverage.some(([a, b]) => a === 0 && b === 24);
  if (alwaysOn) return i18n.ALWAYS_ON;
  if (!coverage.length) return i18n.ON_DEMAND;
  const pad = (n: number) => String(((n % 24) + 24) % 24).padStart(2, '0') + ':00';
  return `${pad(schedule.from)}–${pad(schedule.to)}`;
};

export const CoverageStrip: React.FC<CoverageStripProps> = ({ watches, onSelectWatch }) => {
  const { euiTheme } = useEuiTheme();

  const { nowPct, hhmm, onDuty, total, activeWatches } = useMemo(() => {
    const now = new Date();
    const nowH = now.getHours() + now.getMinutes() / 60;
    const nonDraft = watches.filter((w) => !w.draft);
    return {
      nowPct: (nowH / 24) * 100,
      hhmm: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
        2,
        '0'
      )}`,
      onDuty: nonDraft.filter(
        (w) => w.enabled && isOnDutyNow(w.coverage as Array<[number, number]>, nowH)
      ).length,
      total: nonDraft.length,
      activeWatches: nonDraft,
    };
  }, [watches]);

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{i18n.COVERAGE_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.COVERAGE_SUBTITLE}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <span
              css={css`
                display: inline-flex;
                align-items: center;
                gap: ${euiTheme.size.xs};
                &::before {
                  content: '';
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: ${euiTheme.colors.success};
                }
              `}
            >
              {i18n.onDutyNowLabel(onDuty, total)}
            </span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div
        css={css`
          position: relative;
          margin-top: ${euiTheme.size.m};
          padding-top: ${euiTheme.size.l};
          padding-bottom: ${euiTheme.size.l};
        `}
      >
        {/* grid lines */}
        <div
          aria-hidden="true"
          css={css`
            position: absolute;
            inset: ${euiTheme.size.l} 120px 24px 140px;
            pointer-events: none;
          `}
        >
          {[0, 25, 50, 75, 100].map((left) => (
            <i
              key={left}
              css={css`
                position: absolute;
                top: 0;
                bottom: 0;
                left: ${left}%;
                width: 1px;
                background: ${euiTheme.colors.lightShade};
                opacity: 0.6;
              `}
            />
          ))}
        </div>

        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.s};
          `}
        >
          {activeWatches.map((watch) => (
            <button
              key={watch.id}
              type="button"
              onClick={() => onSelectWatch(watch.id)}
              css={css`
                display: grid;
                grid-template-columns: 140px 1fr 120px;
                align-items: center;
                gap: ${euiTheme.size.s};
                background: transparent;
                border: none;
                padding: 0;
                cursor: pointer;
                text-align: left;
                opacity: ${watch.enabled ? 1 : 0.45};
                &:hover .cov-name {
                  text-decoration: underline;
                }
              `}
            >
              <span
                className="cov-name"
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                  font-size: ${euiTheme.size.m};
                  color: ${euiTheme.colors.textParagraph};
                `}
              >
                <span
                  css={css`
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${watch.color};
                    flex-shrink: 0;
                  `}
                />
                {watch.name}
              </span>
              <span
                css={css`
                  position: relative;
                  height: 14px;
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${euiTheme.colors.lightestShade};
                  overflow: hidden;
                `}
              >
                {watch.coverage.map(([from, to], idx) => (
                  <i
                    key={`${from}-${to}-${idx}`}
                    css={css`
                      position: absolute;
                      top: 2px;
                      bottom: 2px;
                      left: ${(from / 24) * 100}%;
                      width: ${((to - from) / 24) * 100}%;
                      border-radius: 3px;
                      background: ${watch.color};
                      opacity: 0.85;
                    `}
                  />
                ))}
              </span>
              <EuiText size="xs" color="subdued" textAlign="right">
                {formatWindowLabel(watch)}
              </EuiText>
            </button>
          ))}
        </div>

        {/* now marker — after rows so it paints above the coverage bars */}
        <div
          aria-hidden="true"
          css={css`
            position: absolute;
            top: ${euiTheme.size.l};
            bottom: 24px;
            left: 140px;
            right: 120px;
            pointer-events: none;
            z-index: 1;
          `}
        >
          <span
            css={css`
              position: absolute;
              top: 0;
              bottom: 0;
              left: ${nowPct}%;
              width: 1px;
              background: ${euiTheme.colors.fullShade};
            `}
          >
            <b
              css={css`
                position: absolute;
                top: -22px;
                left: 50%;
                transform: translateX(${nowPct < 5 ? '0%' : nowPct > 95 ? '-100%' : '-50%'});
                font-size: 10px;
                font-weight: 600;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
                line-height: 1;
                padding: 3px 7px;
                border-radius: 999px;
                background: ${euiTheme.colors.lightestShade};
                color: ${euiTheme.colors.textParagraph};
                border: 1px solid ${euiTheme.colors.lightShade};
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
              `}
            >
              {hhmm}
            </b>
          </span>
        </div>

        <div
          css={css`
            position: relative;
            margin-left: 140px;
            margin-right: 120px;
            margin-top: ${euiTheme.size.s};
            height: 16px;
          `}
          aria-hidden="true"
        >
          {HOURS.map((h, i) => (
            <span
              key={h}
              css={css`
                position: absolute;
                left: ${i * 25}%;
                transform: ${i === 0
                  ? 'none'
                  : i === HOURS.length - 1
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)'};
                font-size: 10px;
                color: ${euiTheme.colors.textParagraph};
                opacity: 0.65;
              `}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </EuiPanel>
  );
};
