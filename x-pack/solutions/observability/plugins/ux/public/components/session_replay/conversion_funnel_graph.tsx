/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import { EuiText, euiPaletteColorBlind, isColorDark, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import type { FunnelStepStats } from '../../../common/session_funnel';
import { pushRumPath, sessionsPatch } from '../../utils/rum_search';
import {
  formatFunnelCount,
  formatFunnelPercent,
  funnelFlowAreaPath,
  funnelNiceMax,
  toFunnelFlowStages,
  type FunnelFlowStage,
} from './conversion_funnel_graph_data';

const VIEW_W = 1120;
const VIEW_H = 220;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 42;
const PAD_B = 10;
const BAR_W = 44;
const TICKS = 5;

const hexRgb = (color: string): [number, number, number] => {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((ch) => `${ch}${ch}`).join('') : hex.slice(0, 6);
  const channel = (start: number): number => {
    const value = Number.parseInt(full.slice(start, start + 2), 16);
    return Number.isFinite(value) ? value : 0;
  };
  return [channel(0), channel(2), channel(4)];
};

interface FunnelTip {
  x: number;
  y: number;
  title: string;
  lines: string[];
  hint?: string;
}

const openDroppedSessions = (
  history: ReturnType<typeof useHistory>,
  sessionIds: string[]
): void => {
  if (sessionIds.length === 0) {
    return;
  }
  pushRumPath(history, '/session-replay', sessionsPatch({ sessionIds: sessionIds.join(',') }));
};

const barTip = (stage: FunnelFlowStage): Omit<FunnelTip, 'x' | 'y'> => ({
  title: stage.label,
  lines: [
    i18n.translate('xpack.ux.goals.funnelBarSessionsTooltip', {
      defaultMessage: '{count} sessions reached this step',
      values: { count: formatFunnelCount(stage.count) },
    }),
    i18n.translate('xpack.ux.goals.funnelBarOverallTooltip', {
      defaultMessage: '{percent} of the first step',
      values: { percent: formatFunnelPercent(stage.conversionFromStart) },
    }),
    ...(stage.previousLabel
      ? [
          i18n.translate('xpack.ux.goals.funnelBarPreviousTooltip', {
            defaultMessage: '{percent} from {previous}',
            values: {
              percent: formatFunnelPercent(stage.conversionFromPrevious),
              previous: stage.previousLabel,
            },
          }),
        ]
      : []),
  ],
});

const dropTip = (stage: FunnelFlowStage): Omit<FunnelTip, 'x' | 'y'> => ({
  title: i18n.translate('xpack.ux.goals.funnelDropoffTooltipTitle', {
    defaultMessage: '{from} → {to}',
    values: { from: stage.previousLabel ?? '', to: stage.label },
  }),
  lines: [
    i18n.translate('xpack.ux.goals.funnelDropoffTooltipBody', {
      defaultMessage: '{count} sessions dropped ({percent})',
      values: {
        count: formatFunnelCount(stage.dropOffCount),
        percent: formatFunnelPercent(stage.dropOffRate),
      },
    }),
  ],
  hint:
    stage.sampleDroppedSessionIds.length > 0
      ? i18n.translate('xpack.ux.goals.funnelDropoffTooltipHint', {
          defaultMessage: 'Click to open dropped sessions',
        })
      : undefined,
});

const flowTip = (from: FunnelFlowStage, to: FunnelFlowStage): Omit<FunnelTip, 'x' | 'y'> => ({
  title: i18n.translate('xpack.ux.goals.funnelFlowTooltipTitle', {
    defaultMessage: '{from} → {to}',
    values: { from: from.label, to: to.label },
  }),
  lines: [
    i18n.translate('xpack.ux.goals.funnelFlowTooltipBody', {
      defaultMessage: '{count} sessions continued ({percent})',
      values: {
        count: formatFunnelCount(to.count),
        percent: formatFunnelPercent(to.conversionFromPrevious),
      },
    }),
  ],
});

export function ConversionFunnelGraph({ steps }: { steps: FunnelStepStats[] }) {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<FunnelTip | null>(null);
  const [hotKey, setHotKey] = useState<string | null>(null);
  const stages = useMemo(() => toFunnelFlowStages(steps), [steps]);
  const palette = useMemo(() => euiPaletteColorBlind({ rotations: 1 }), []);

  if (!stages) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.ux.goals.funnelEmptyLabel', {
          defaultMessage: 'No sessions reached the first step in this range.',
        })}
      </EuiText>
    );
  }

  const maxCount = funnelNiceMax(Math.max(...stages.map((stage) => stage.count)));
  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  const colW = plotW / stages.length;
  const dropFill = euiTheme.colors.danger;
  const grid = euiTheme.colors.borderBaseSubdued;
  const axis = euiTheme.colors.textSubdued;
  const ink = euiTheme.colors.textParagraph;

  const yAt = (count: number): number => PAD_T + (count / maxCount) * plotH;
  const barX = (index: number): number => PAD_L + index * colW + (colW - BAR_W) / 2;
  const colCx = (index: number): number => PAD_L + index * colW + colW / 2;

  const moveTip = (event: React.MouseEvent, next: Omit<FunnelTip, 'x' | 'y'>): void => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    setTip({ ...next, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const clearTip = (): void => {
    setTip(null);
    setHotKey(null);
  };

  return (
    <div
      ref={wrapRef}
      data-test-subj="uxGoalFunnelGraph"
      onMouseLeave={clearTip}
      css={css`
        position: relative;
        width: 100%;
      `}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        role="group"
        aria-label={i18n.translate('xpack.ux.goals.funnelChartAriaLabel', {
          defaultMessage: 'Conversion funnel chart',
        })}
        css={css`
          display: block;
          width: 100%;
          height: auto;
          font-family: ${euiTheme.font.family};

          .funnelDeco {
            pointer-events: none;
          }

          .funnelHit {
            cursor: default;
          }

          .funnelHitClick {
            cursor: pointer;
          }

          .funnelHitClick:focus {
            outline: 2px solid ${euiTheme.colors.borderStrongPrimary};
            outline-offset: 2px;
          }
        `}
      >
        {Array.from({ length: TICKS }, (_, i) => {
          const value = (maxCount * i) / (TICKS - 1);
          const y = yAt(value);
          return (
            <g key={`tick-${i}`} className="funnelDeco">
              <line x1={PAD_L} x2={VIEW_W - PAD_R} y1={y} y2={y} stroke={grid} strokeWidth={1} />
              <text x={PAD_L - 8} y={y + 4} textAnchor="end" fill={axis} fontSize={11}>
                {formatFunnelCount(value)}
              </text>
            </g>
          );
        })}

        {stages.slice(0, -1).map((stage, index) => {
          const next = stages[index + 1];
          const x0 = barX(index) + BAR_W;
          const x1 = barX(index + 1);
          const key = `flow:${stage.key}`;
          return (
            <path
              key={key}
              className="funnelHit"
              d={funnelFlowAreaPath(x0, yAt(stage.count), x1, yAt(next.count), PAD_T)}
              fill={palette[index % palette.length]}
              fillOpacity={hotKey === key ? 0.32 : 0.18}
              onMouseEnter={() => setHotKey(key)}
              onMouseMove={(event) => moveTip(event, flowTip(stage, next))}
            />
          );
        })}

        {stages.map((stage, index) => {
          const x = barX(index);
          const color = palette[index % palette.length];
          const keepH = yAt(stage.count) - PAD_T;
          const dropH = yAt(stage.count + stage.dropOffCount) - yAt(stage.count);
          const cx = x + BAR_W / 2;
          const barKey = `bar:${stage.key}`;
          const dropKey = `drop:${stage.key}`;
          const canOpenDrop = stage.sampleDroppedSessionIds.length > 0;
          const darkBar = isColorDark(...hexRgb(color));
          const onBar = darkBar ? euiTheme.colors.plainLight : euiTheme.colors.plainDark;
          return (
            <g key={stage.key}>
              <line
                className="funnelDeco"
                x1={colCx(index)}
                x2={colCx(index)}
                y1={PAD_T}
                y2={VIEW_H - PAD_B}
                stroke={grid}
                strokeWidth={1}
              />
              <text
                className="funnelDeco"
                x={colCx(index)}
                y={18}
                textAnchor="middle"
                fill={ink}
                fontSize={12}
                fontWeight={600}
              >
                {stage.label}
              </text>
              <text
                className="funnelDeco"
                x={colCx(index)}
                y={36}
                textAnchor="middle"
                fill={axis}
                fontSize={11}
              >
                {i18n.translate('xpack.ux.goals.funnelSessionsCountLabel', {
                  defaultMessage: '{count} sessions',
                  values: { count: formatFunnelCount(stage.count) },
                })}
              </text>
              <rect
                className="funnelHit"
                data-test-subj={`uxGoalFunnelBar-${index}`}
                x={x}
                y={PAD_T}
                width={BAR_W}
                height={Math.max(0, keepH)}
                fill={color}
                fillOpacity={hotKey === barKey ? 1 : 0.92}
                onMouseEnter={() => setHotKey(barKey)}
                onMouseMove={(event) => moveTip(event, barTip(stage))}
              />
              {stage.dropOffCount > 0 ? (
                <>
                  <rect
                    className={canOpenDrop ? 'funnelHitClick' : 'funnelHit'}
                    data-test-subj={`uxGoalFunnelDropoff-${index}`}
                    x={x}
                    y={yAt(stage.count)}
                    width={BAR_W}
                    height={Math.max(0, dropH)}
                    fill={dropFill}
                    fillOpacity={hotKey === dropKey ? 1 : 0.85}
                    role={canOpenDrop ? 'button' : undefined}
                    tabIndex={canOpenDrop ? 0 : undefined}
                    aria-label={
                      canOpenDrop
                        ? i18n.translate('xpack.ux.goals.funnelDropoffAriaLabel', {
                            defaultMessage: 'Open sessions that dropped from {from} to {to}',
                            values: { from: stage.previousLabel ?? '', to: stage.label },
                          })
                        : undefined
                    }
                    onMouseEnter={() => setHotKey(dropKey)}
                    onMouseMove={(event) => moveTip(event, dropTip(stage))}
                    onClick={() => openDroppedSessions(history, stage.sampleDroppedSessionIds)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openDroppedSessions(history, stage.sampleDroppedSessionIds);
                      }
                    }}
                  />
                  <text
                    className={canOpenDrop ? 'funnelHitClick' : 'funnelDeco'}
                    x={x + BAR_W + 6}
                    y={yAt(stage.count) + Math.max(12, dropH / 2 + 4)}
                    fill={dropFill}
                    fontSize={11}
                    onMouseEnter={() => setHotKey(dropKey)}
                    onMouseMove={(event) => moveTip(event, dropTip(stage))}
                    onClick={() => openDroppedSessions(history, stage.sampleDroppedSessionIds)}
                  >
                    {i18n.translate('xpack.ux.goals.funnelDropoffCalloutLabel', {
                      defaultMessage: '{percent} dropoff',
                      values: { percent: formatFunnelPercent(stage.dropOffRate) },
                    })}
                  </text>
                </>
              ) : null}
              {index > 0 && keepH > 28 ? (
                <text
                  className="funnelDeco"
                  x={cx}
                  y={PAD_T + keepH / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={onBar}
                  fontSize={13}
                  fontWeight={700}
                >
                  {formatFunnelPercent(stage.conversionFromPrevious)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {tip ? (
        <div
          role="tooltip"
          css={css`
            position: absolute;
            left: ${Math.min(tip.x + 12, (wrapRef.current?.clientWidth ?? VIEW_W) - 220)}px;
            top: ${tip.y + 12}px;
            z-index: 2;
            pointer-events: none;
            min-width: 160px;
            max-width: 240px;
            padding: ${euiTheme.size.s};
            background: ${euiTheme.colors.backgroundBasePlain};
            border: 1px solid ${euiTheme.colors.borderBaseSubdued};
            border-radius: ${euiTheme.border.radius.medium};
            color: ${ink};
            font-size: ${euiTheme.size.m};
            line-height: 1.4;
          `}
        >
          <div
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              margin-bottom: 4px;
            `}
          >
            {tip.title}
          </div>
          {tip.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
          {tip.hint ? (
            <div
              css={css`
                margin-top: 4px;
                color: ${axis};
              `}
            >
              {tip.hint}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
