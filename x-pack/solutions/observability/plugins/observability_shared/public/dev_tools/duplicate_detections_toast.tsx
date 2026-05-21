/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DuplicateDetectionEvent {
  /**
   * Owning plugin – derived from the URL (segment after `/api/` or
   * `/internal/`). Falls back to the active Kibana app, then the static
   * `source` option the detector was started with.
   */
  source: string;
  /** Kibana app id active when the burst happened (extra context). */
  app?: string;
  /** HTTP method, normalized to upper-case. */
  method: string;
  /** Path on the Kibana server (no basePath). */
  path: string;
  /** Number of identical (payload + response) requests inside the window. */
  count: number;
  /** Span of the duplicate burst, in ms. */
  elapsedMs: number;
  /** `Date.now()` when the detection fired. */
  detectedAt: number;
}

interface DuplicateDetectionsToastBodyProps {
  events$: Observable<DuplicateDetectionEvent[]>;
  /**
   * Optional callback to open a richer details view. When provided, the toast
   * renders a "View details" link in its footer that calls this with the
   * `detectedAt` of the currently-displayed event (so the flyout can deep-link
   * to whatever the user was inspecting).
   */
  onShowDetails?: (anchorDetectedAt: number) => void;
  /**
   * Optional callback to pause the detector entirely. When provided, the
   * toast renders a small Pause icon button that mutes detection without
   * requiring the user to open the flyout's Settings tab.
   */
  onPause?: () => void;
  /**
   * Optional callback to open the flyout pre-switched to the Settings tab.
   * Used by the toast's gear icon button.
   */
  onOpenSettings?: () => void;
}

/**
 * Renders the body of the consolidated "duplicate network requests" toast.
 * Subscribes to a shared `BehaviorSubject` so the toast updates in-place as
 * new detections stream in. Provides prev/next navigation, auto-jumps to the
 * newest event when the user is already viewing the newest, and shows a
 * summary count of detections + distinct endpoints.
 */
export const DuplicateDetectionsToastBody: React.FC<DuplicateDetectionsToastBodyProps> = ({
  events$,
  onShowDetails,
  onPause,
  onOpenSettings,
}) => {
  const { euiTheme } = useEuiTheme();
  const events = useObservable<DuplicateDetectionEvent[]>(events$, []);

  // Anchor by `detectedAt` instead of array index so that when new events are
  // prepended (events[0] = newest), the user stays pinned to the SAME event
  // they were inspecting rather than visually "scrolling back" by one slot.
  // `null` means "pinned to newest".
  const [anchorDetectedAt, setAnchorDetectedAt] = useState<number | null>(null);

  const distinctEndpoints = useMemo(
    () => new Set(events.map((e) => `${e.source}|${e.method} ${e.path}`)).size,
    [events]
  );

  const total = events.length;

  // Resolve the current display index from the anchor.
  let resolvedIndex = 0;
  if (anchorDetectedAt !== null && total > 0) {
    const found = events.findIndex((e) => e.detectedAt === anchorDetectedAt);
    resolvedIndex = found === -1 ? Math.max(0, total - 1) : found;
  }

  // If the anchored event has been pruned (e.g. ring buffer overflow), fall
  // back to "pinned to newest" so we don't get stuck on a stale anchor.
  useEffect(() => {
    if (anchorDetectedAt === null || total === 0) return;
    if (!events.some((e) => e.detectedAt === anchorDetectedAt)) {
      setAnchorDetectedAt(null);
    }
  }, [events, total, anchorDetectedAt]);

  const handlePrev = useCallback(() => {
    if (total === 0) return;
    const nextIndex = Math.min(resolvedIndex + 1, total - 1);
    setAnchorDetectedAt(events[nextIndex].detectedAt);
  }, [events, resolvedIndex, total]);

  const handleNext = useCallback(() => {
    if (total === 0) return;
    const nextIndex = Math.max(resolvedIndex - 1, 0);
    setAnchorDetectedAt(nextIndex === 0 ? null : events[nextIndex].detectedAt);
  }, [events, resolvedIndex, total]);

  if (total === 0) {
    return null;
  }

  const current = events[resolvedIndex];
  const elapsedSeconds = (current.elapsedMs / 1000).toFixed(current.elapsedMs >= 1000 ? 1 : 2);
  const positionLabel = `${total - resolvedIndex} / ${total}`;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      responsive={false}
      data-test-subj="duplicateDetectionsToastBody"
    >
      <EuiFlexItem>
        <code css={methodPathStyles(euiTheme)} data-test-subj="duplicateDetectionsToastEndpoint">
          <strong>{current.method}</strong>
          <span css={pathStyles}>{current.path}</span>
        </code>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">{current.source}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.eventStats', {
                defaultMessage: '{count}× within {elapsedSeconds}s · matched payload & response',
                values: { count: current.count, elapsedSeconds },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.observabilityShared.duplicateRequestDetector.eventHint', {
            defaultMessage:
              'Likely caused by re-render loops, unmemoized hooks, or misconfigured useEffect dependencies.',
          })}
        </EuiText>
      </EuiFlexItem>

      <EuiHorizontalRule margin="xs" />

      <EuiFlexItem>
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="xs"
                  iconType="arrowLeft"
                  isDisabled={resolvedIndex >= total - 1}
                  onClick={handlePrev}
                  data-test-subj="duplicateDetectionsToastPrev"
                  aria-label={i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.prevAriaLabel',
                    { defaultMessage: 'Previous detection' }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="xs"
                  color="subdued"
                  data-test-subj="duplicateDetectionsToastPosition"
                >
                  {i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.positionLabel',
                    {
                      defaultMessage:
                        '{position} ({endpoints, plural, one {# endpoint} other {# endpoints}})',
                      values: { position: positionLabel, endpoints: distinctEndpoints },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="xs"
                  iconType="arrowRight"
                  isDisabled={resolvedIndex <= 0}
                  onClick={handleNext}
                  data-test-subj="duplicateDetectionsToastNext"
                  aria-label={i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.nextAriaLabel',
                    { defaultMessage: 'Next (newer) detection' }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
              {onPause && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    size="xs"
                    iconType="pause"
                    color="warning"
                    onClick={onPause}
                    data-test-subj="duplicateDetectionsToastPause"
                    aria-label={i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.pauseAriaLabel',
                      { defaultMessage: 'Pause duplicate detection' }
                    )}
                    title={i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.pauseTitle',
                      { defaultMessage: 'Pause duplicate detection' }
                    )}
                  />
                </EuiFlexItem>
              )}
              {onOpenSettings && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    size="xs"
                    iconType="gear"
                    onClick={onOpenSettings}
                    data-test-subj="duplicateDetectionsToastSettings"
                    aria-label={i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.settingsAriaLabel',
                      { defaultMessage: 'Open detector settings' }
                    )}
                    title={i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.settingsTitle',
                      { defaultMessage: 'Open detector settings' }
                    )}
                  />
                </EuiFlexItem>
              )}
              {onShowDetails && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    iconType="inspect"
                    iconSide="right"
                    onClick={() => onShowDetails(current.detectedAt)}
                    data-test-subj="duplicateDetectionsToastShowDetails"
                  >
                    {i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.showDetailsBtn',
                      { defaultMessage: 'View details' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * `METHOD /path` line.
 *  - Renders as `inline-block` (not `inline`) so the EuiCode-like background
 *    can wrap multi-line without leaving a step on the right edge.
 *  - `overflow-wrap: anywhere` + `word-break: normal` lets long URLs break at
 *    slashes/dots first and only fall back to mid-character splits when no
 *    other break opportunity exists. Avoids the ugly `/fiel/ds` wrap we had
 *    with EuiCode's default `word-break: break-all`.
 */
const methodPathStyles = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  display: inline-block;
  font-family: ${euiTheme.font.familyCode};
  font-size: ${euiTheme.size.m};
  line-height: 1.4;
  margin-bottom: ${euiTheme.size.xs};

  strong {
    color: ${euiTheme.colors.textAccent};
    margin-right: ${euiTheme.size.s};
  }
`;

const pathStyles = css`
  word-break: normal;
  overflow-wrap: anywhere;
`;
