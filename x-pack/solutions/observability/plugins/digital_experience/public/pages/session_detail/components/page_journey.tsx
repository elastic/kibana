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
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiOverflowScroll,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CORE_WEB_VITALS } from '../../../../common/core_web_vitals';
import type { SessionTimelineEvent, SessionTimelineEventKind } from '../../../../common/sessions';
import { WebVitalBadge, WebVitalBadges } from '../../../components/web_vital_badges';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import type { PageVisitEvents } from '../utils/session_timeline';
import { formatOffset } from '../utils/session_timeline';

const EVENT_ICONS: Partial<Record<SessionTimelineEventKind, IconType>> = {
  page_view: 'document',
  click: 'clickLeft',
  error: 'error',
  web_vital: 'visGauge',
};

const EVENT_KIND_LABELS: Partial<Record<SessionTimelineEventKind, string>> = {
  page_view: i18n.translate('xpack.digitalExperience.sessionDetail.journey.pageViewLabel', {
    defaultMessage: 'Page view',
  }),
  click: i18n.translate('xpack.digitalExperience.sessionDetail.journey.clickLabel', {
    defaultMessage: 'Click',
  }),
  error: i18n.translate('xpack.digitalExperience.sessionDetail.journey.errorLabel', {
    defaultMessage: 'Error',
  }),
  web_vital: i18n.translate('xpack.digitalExperience.sessionDetail.journey.webVitalLabel', {
    defaultMessage: 'Web vital',
  }),
};

/** A web vital event as a rated badge, when its name and value are a known vital's. */
const webVitalOf = ({ kind, name, detail }: SessionTimelineEvent) => {
  const vital = CORE_WEB_VITALS.find((candidate) => candidate === name.toLowerCase());
  const value = Number(detail);
  return kind === 'web_vital' && vital && detail !== null && Number.isFinite(value)
    ? { vital, value }
    : null;
};

/** Page views and clicks read better by kind; errors and vitals keep their type and name. */
const LABELLED_KINDS: ReadonlySet<SessionTimelineEventKind> = new Set(['page_view', 'click']);

const EventRow = ({ event }: { event: SessionTimelineEvent }) => {
  const { euiTheme } = useEuiTheme();
  const isError = event.kind === 'error';
  const webVital = webVitalOf(event);
  const kindLabel = EVENT_KIND_LABELS[event.kind];
  const labelledByKind = LABELLED_KINDS.has(event.kind) && kindLabel !== undefined;
  const name = labelledByKind ? kindLabel : event.name;
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj={`digitalExperienceSessionEvent-${event.kind}`}
    >
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          css={css({
            fontVariantNumeric: 'tabular-nums',
            minWidth: euiTheme.size.xxl,
            textAlign: 'right',
          })}
        >
          {formatOffset(event.offsetMs)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={EVENT_ICONS[event.kind] ?? 'dot'}
          color={isError ? 'danger' : 'subdued'}
          // The row already reads as its kind when it is labelled by it.
          aria-label={labelledByKind ? undefined : kindLabel}
          aria-hidden={labelledByKind || undefined}
        />
      </EuiFlexItem>
      {webVital ? (
        <EuiFlexItem grow={false}>
          <WebVitalBadge vital={webVital.vital} value={webVital.value} />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color={isError ? 'danger' : undefined}>
            {isError ? <strong>{name}</strong> : name}
          </EuiText>
        </EuiFlexItem>
      )}
      {!webVital && event.detail && (
        <EuiFlexItem css={css({ minWidth: 0 })}>
          <EuiText
            size="xs"
            color={isError ? 'danger' : 'subdued'}
            className="eui-textTruncate"
            title={event.detail}
            css={isError ? undefined : css({ fontFamily: euiTheme.font.familyCode })}
          >
            {event.detail}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/**
 * One card per page visit, in order: the page, when and how long, its counts and web vitals, and its
 * page views, clicks, errors and web vitals as they happened.
 */
export function PageJourney({
  visits,
  colors,
  sessionDurationMs,
  formatters: { formatDate, formatPercent },
  registerVisit,
}: {
  visits: PageVisitEvents[];
  colors: Map<string, string>;
  sessionDurationMs: number;
  formatters: Formatters;
  /** Lets the waterfall scroll to a visit. */
  registerVisit: (index: number, element: HTMLElement | null) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const eventsCss = css`
    max-height: ${euiTheme.base * 20}px;
    ${useEuiOverflowScroll('y', true)}
  `;
  // Clears the fixed (classic) or sticky (grid layout) headers when scrolled to, with a gap.
  const visitCss = css({
    scrollMarginTop: `calc(var(--euiFixedHeadersOffset, 0px) + var(--kbn-application--sticky-headers-offset, 0px) + ${euiTheme.size.m})`,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="digitalExperiencePageJourney">
      {visits.map(({ visit, events }, index) => (
        <EuiFlexItem key={`${visit.startTime}-${index}`}>
          <div ref={(element) => registerVisit(index, element)} css={visitCss}>
            <EuiPanel
              hasBorder
              paddingSize="m"
              data-test-subj="digitalExperiencePageVisit"
              css={css({ borderLeft: `${euiTheme.size.xs} solid ${colors.get(visit.page)}` })}
            >
              <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{index + 1}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem css={css({ minWidth: 0 })}>
                  <EuiTitle size="xxs">
                    <h3
                      className="eui-textTruncate"
                      title={visit.url ?? visit.page}
                      css={css({ fontFamily: euiTheme.font.familyCode })}
                    >
                      {visit.page}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate(
                      'xpack.digitalExperience.sessionDetail.journey.visitTimeLabel',
                      {
                        defaultMessage: '{startTime} for {duration}',
                        values: {
                          startTime: formatDate(visit.startTime),
                          duration: formatSessionDuration(visit.durationMs),
                        },
                      }
                    )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" iconType="clock">
                    {i18n.translate('xpack.digitalExperience.sessionDetail.journey.shareLabel', {
                      defaultMessage: '{share} of the session',
                      values: {
                        share: formatPercent(visit.durationMs / Math.max(1, sessionDurationMs)),
                      },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" iconType="clickLeft">
                    {i18n.translate('xpack.digitalExperience.sessionDetail.journey.clicksLabel', {
                      defaultMessage: '{count, plural, one {# click} other {# clicks}}',
                      values: { count: visit.clickCount },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
                {visit.errorCount > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger" iconType="error">
                      {i18n.translate('xpack.digitalExperience.sessionDetail.journey.errorsLabel', {
                        defaultMessage: '{count, plural, one {# error} other {# errors}}',
                        values: { count: visit.errorCount },
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <WebVitalBadges webVitals={visit.webVitals} />
                </EuiFlexItem>
              </EuiFlexGroup>
              {events.length > 0 && (
                <>
                  <EuiSpacer size="m" />
                  {/* Focusable, so keyboard users can scroll a long list of events too. */}
                  <EuiFlexGroup
                    direction="column"
                    gutterSize="xs"
                    css={eventsCss}
                    tabIndex={0}
                    role="region"
                    aria-label={i18n.translate(
                      'xpack.digitalExperience.sessionDetail.journey.eventsLabel',
                      { defaultMessage: 'Events on {page}', values: { page: visit.page } }
                    )}
                  >
                    {events.map((event, eventIndex) => (
                      <EuiFlexItem key={eventIndex} grow={false}>
                        <EventRow event={event} />
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </>
              )}
            </EuiPanel>
          </div>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
