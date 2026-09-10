/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Use of this file is governed by the
 * Elastic License 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { css, keyframes } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
  type EuiHealthProps,
} from '@elastic/eui';
import type { Worker } from '@kbn/alertzero-common';
import * as i18n from '../settings_translations';
import * as watchesI18n from '../translations';
import { workerName } from '../workers/translations';
import { formatRelativeTime } from './format_relative_time';

/** DOM id for the scroll-to target of a Worker section in the settings column. */
export const workerSectionDomId = (workerId: string): string => `worker-section-${workerId}`;

/**
 * One-shot highlight applied to a Worker section after the summary rail scrolls to it, so the
 * destination is obvious when several Workers are stacked.
 */
export const workerPanelPulseCss = (primary: string) => {
  const pulse = keyframes`
    0% { box-shadow: 0 0 0 2px ${primary}; }
    100% { box-shadow: 0 0 0 2px transparent; }
  `;
  return css`
    animation: ${pulse} 1.2s ease-out;
  `;
};

interface WorkerStatus {
  label: string;
  color: EuiHealthProps['color'];
}

const resolveStatus = (worker: Worker): WorkerStatus => {
  if (!worker.enabled) {
    return { label: i18n.RAIL_STATUS_DISABLED, color: 'subdued' };
  }
  switch (worker.state) {
    case 'paused':
      return { label: i18n.RAIL_STATUS_PAUSED, color: 'warning' };
    case 'unavailable':
      return { label: i18n.RAIL_STATUS_UNAVAILABLE, color: 'danger' };
    case 'degraded':
      return { label: i18n.RAIL_STATUS_DEGRADED, color: 'warning' };
    default:
      return { label: i18n.RAIL_STATUS_ENABLED, color: 'success' };
  }
};

/** Label column width for the per-Worker data rows, kept wide enough for the longest label. */
const DATA_LABEL_COL_PX = 72;

function DataLine({ label, value }: { label: string; value: string }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: ${DATA_LABEL_COL_PX}px minmax(0, 1fr);
        gap: ${euiTheme.size.s};
        align-items: baseline;
        padding-block: 5px;
      `}
    >
      <span
        css={css`
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1.3;
          color: ${euiTheme.colors.textSubdued};
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        `}
      >
        {label}
      </span>
      <span
        css={css`
          font-size: 12.5px;
          font-weight: 400;
          line-height: 1.3;
          color: ${euiTheme.colors.textParagraph};
          text-align: left;
          font-variant-numeric: tabular-nums;
        `}
      >
        {value}
      </span>
    </div>
  );
}

const statusDotColor = (color: EuiHealthProps['color'], textSubdued: string) =>
  color === 'subdued' ? textSubdued : color;

interface WatchWorkersSummaryRailProps {
  workers: Worker[];
  activeWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
}

/**
 * Right-hand column of the two-column Worker layout. One compact card per Worker; clicking a card
 * expands and scrolls to that Worker's settings panel. The active card tracks scroll position.
 */
export const WatchWorkersSummaryRail: React.FC<WatchWorkersSummaryRailProps> = ({
  workers,
  activeWorkerId,
  onSelectWorker,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <aside
      css={css`
        position: sticky;
        top: ${euiTheme.size.l};
      `}
      data-test-subj="alertZeroWatchWorkersRail"
    >
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <strong
              css={css`
                display: block;
                padding-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
              `}
            >
              {i18n.WORKERS_RAIL_HEADING}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: 12px;
          `}
        >
          {workers.map((worker) => {
            const name = workerName(worker.id, worker.name);
            const status = resolveStatus(worker);
            const isActive = worker.id === activeWorkerId;
            return (
              <EuiFlexItem key={worker.id} grow={false}>
                <EuiPanel
                  hasBorder
                  hasShadow={false}
                  paddingSize="none"
                  element="button"
                  type="button"
                  color="transparent"
                  onClick={() => onSelectWorker(worker.id)}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={i18n.railGoToWorker(name)}
                  data-test-subj={`alertZeroWatchWorkerSummary-${worker.id}`}
                  css={css`
                    display: block;
                    width: 100%;
                    padding: 14px 16px;
                    text-align: left;
                    cursor: pointer;
                    border-color: ${isActive ? euiTheme.colors.primary : euiTheme.border.color};
                    &:hover {
                      border-color: ${euiTheme.colors.primary};
                    }
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                      outline-offset: 2px;
                    }
                  `}
                >
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    wrap={false}
                    css={css`
                      padding-bottom: 10px;
                      margin-bottom: 10px;
                      border-bottom: ${euiTheme.border.thin};
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <span
                        aria-hidden
                        css={css`
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background: ${euiTheme.colors[
                            statusDotColor(status.color, 'textSubdued') as 'success'
                          ]};
                          flex-shrink: 0;
                        `}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <EuiText size="s">
                        <strong
                          css={css`
                            color: ${worker.enabled ? undefined : euiTheme.colors.textSubdued};
                          `}
                        >
                          {name}
                        </strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <span
                        css={css`
                          font-size: 11px;
                          line-height: 1.2;
                          color: ${euiTheme.colors.textSubdued};
                        `}
                      >
                        {status.label}
                      </span>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <DataLine
                    label={i18n.RAIL_LAST_RUN}
                    value={
                      worker.lastRun != null
                        ? formatRelativeTime(worker.lastRun)
                        : watchesI18n.NOT_RUN_YET
                    }
                  />
                  <DataLine
                    label={i18n.RAIL_AUTONOMY}
                    value={i18n.autonomyLevelName(worker.settings.autonomy)}
                  />
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </div>
      </EuiFlexGroup>
    </aside>
  );
};

/**
 * Tracks which Worker section is most in view and reports it, so the summary rail's active card
 * follows the reader as they scroll. No-op when disabled (single-Worker Watches have no rail
 * navigation to synchronise).
 */
export const useWorkerScrollSpy = (
  workerIds: readonly string[],
  enabled: boolean,
  onActiveChange: (workerId: string) => void
): void => {
  const onActiveRef = useRef(onActiveChange);
  onActiveRef.current = onActiveChange;

  const key = workerIds.join('\u0000');

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const sections = workerIds
      .map((workerId) => document.getElementById(workerSectionDomId(workerId)))
      .filter((element): element is HTMLElement => element != null);
    if (sections.length === 0) {
      return;
    }

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const workerId = entry.target.id.slice(workerSectionDomId('').length);
          if (entry.isIntersecting) {
            visible.set(workerId, entry.intersectionRatio);
          } else {
            visible.delete(workerId);
          }
        }
        let bestId = '';
        let bestRatio = -1;
        for (const [workerId, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = workerId;
          }
        }
        if (bestId) {
          onActiveRef.current(bestId);
        }
      },
      { root: null, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
    // workerIds membership changes are folded into `key` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
};
