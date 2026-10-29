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
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SessionTimelineEvent, SessionTimelineEventKind } from '../../../../common/sessions';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import type { PageVisitEvents } from '../utils/session_timeline';
import { formatOffset } from '../utils/session_timeline';
import { WebVitalBadges } from './web_vital_badges';

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

const EventRow = ({ event }: { event: SessionTimelineEvent }) => {
  const { euiTheme } = useEuiTheme();
  const isError = event.kind === 'error';
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
          css={css({ fontVariantNumeric: 'tabular-nums', minWidth: '3.5em', textAlign: 'right' })}
        >
          {formatOffset(event.offsetMs)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={EVENT_ICONS[event.kind] ?? 'dot'}
          color={isError ? 'danger' : 'subdued'}
          aria-label={EVENT_KIND_LABELS[event.kind]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={isError ? 'danger' : undefined}>
          {isError ? <strong>{event.name}</strong> : event.name}
        </EuiText>
      </EuiFlexItem>
      {event.detail && (
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
  formatters: { formatDate },
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

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="digitalExperiencePageJourney">
      {visits.map(({ visit, events }, index) => (
        <EuiFlexItem key={`${visit.startTime}-${index}`}>
          <div ref={(element) => registerVisit(index, element)} css={css({ scrollMarginTop: 80 })}>
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
                      defaultMessage: '{share}% of the session',
                      values: {
                        share: Math.round(
                          (visit.durationMs / Math.max(1, sessionDurationMs)) * 100
                        ),
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
                  <EuiFlexGroup
                    direction="column"
                    gutterSize="xs"
                    css={css({ maxHeight: 320, overflowY: 'auto' })}
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
