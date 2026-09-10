/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { css, keyframes } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiText,
  EuiTitle,
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
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{i18n.WORKERS_RAIL_HEADING}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {workers.map((worker) => {
          const name = workerName(worker.id, worker.name);
          const status = resolveStatus(worker);
          const isActive = worker.id === activeWorkerId;
          return (
            <EuiFlexItem key={worker.id} grow={false}>
              <EuiPanel
                hasBorder
                paddingSize="s"
                color={isActive ? 'primary' : 'transparent'}
                onClick={() => onSelectWorker(worker.id)}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectWorker(worker.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-current={isActive ? 'true' : undefined}
                aria-label={i18n.railGoToWorker(name)}
                data-test-subj={`alertZeroWatchWorkerSummary-${worker.id}`}
                css={css`
                  cursor: pointer;
                  outline-offset: 2px;
                `}
              >
                <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="s"
                      responsive={false}
                      wrap={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiHealth color={status.color} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{name}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {status.label}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <strong>{i18n.RAIL_LAST_RUN}</strong>{' '}
                          {worker.lastRun != null
                            ? formatRelativeTime(worker.lastRun)
                            : watchesI18n.NOT_RUN_YET}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <strong>{i18n.RAIL_AUTONOMY}</strong>{' '}
                          {i18n.autonomyLevelName(worker.settings.autonomy)}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          );
        })}
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
