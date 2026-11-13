/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WebVitalBadges } from '../../../components/web_vital_badges';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatBytes } from '../../../utils/format_bytes';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import type { PageVisitEvents } from '../utils/session_timeline';
import { buildVisitActivity, formatElapsed, type ActivityFilters } from '../utils/visit_activity';
import { VisitActivity } from './visit_activity';

const IN_APP_NAVIGATION_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.journey.inAppNavigation',
  { defaultMessage: 'In-app navigation' }
);

/** The visit's numbers: how it loaded, its requests, clicks and errors. */
function VisitBadges({ visit, requests }: Pick<PageVisitEvents, 'visit' | 'requests'>) {
  const failed = requests.filter((request) => request.failed).length;
  const transferred = requests.reduce((sum, { transferSize }) => sum + (transferSize ?? 0), 0);
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {visit.load?.loadMs != null ? (
          <EuiBadge
            color="hollow"
            iconType="refreshTime"
            data-test-subj="digitalExperienceVisitLoad"
          >
            {i18n.translate('xpack.digitalExperience.sessionDetail.journey.loadedIn', {
              defaultMessage: 'Loaded in {duration}',
              values: { duration: formatElapsed(visit.load.loadMs) },
            })}
          </EuiBadge>
        ) : (
          <EuiBadge color="hollow" iconType="sortRight">
            {IN_APP_NAVIGATION_LABEL}
          </EuiBadge>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" iconType="globe" data-test-subj="digitalExperienceVisitRequests">
          {transferred > 0
            ? i18n.translate('xpack.digitalExperience.sessionDetail.journey.requestsWithSize', {
                defaultMessage: '{count, plural, one {# request} other {# requests}} · {size}',
                values: { count: requests.length, size: formatBytes(transferred) },
              })
            : i18n.translate('xpack.digitalExperience.sessionDetail.journey.requests', {
                defaultMessage: '{count, plural, one {# request} other {# requests}}',
                values: { count: requests.length },
              })}
        </EuiBadge>
      </EuiFlexItem>
      {failed > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger" iconType="warning">
            {i18n.translate('xpack.digitalExperience.sessionDetail.journey.failedRequests', {
              defaultMessage: '{count} failed',
              values: { count: failed },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
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
  );
}

function VisitCard({
  index,
  visitEvents: { visit, events, requests },
  color,
  filters,
  formatDate,
  registerVisit,
}: {
  index: number;
  visitEvents: PageVisitEvents;
  color: string | undefined;
  filters: ActivityFilters;
  formatDate: Formatters['formatDate'];
  registerVisit: (index: number, element: HTMLElement | null) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const activity = useMemo(
    () => buildVisitActivity(visit, events, requests, filters),
    [visit, events, requests, filters]
  );
  // Clears the fixed (classic) or sticky (grid layout) headers when scrolled to, with a gap.
  const visitCss = css({
    scrollMarginTop: `calc(var(--euiFixedHeadersOffset, 0px) + var(--kbn-application--sticky-headers-offset, 0px) + ${euiTheme.size.m})`,
  });

  return (
    <div ref={(element) => registerVisit(index, element)} css={visitCss}>
      <EuiPanel
        hasBorder
        paddingSize="m"
        data-test-subj="digitalExperiencePageVisit"
        css={css({ borderLeft: `${euiTheme.size.xs} solid ${color}` })}
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
              {i18n.translate('xpack.digitalExperience.sessionDetail.journey.visitTimeLabel', {
                defaultMessage: '{startTime} for {duration}',
                values: {
                  startTime: formatDate(visit.startTime),
                  duration: formatSessionDuration(visit.durationMs),
                },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <VisitBadges visit={visit} requests={requests} />
        <EuiSpacer size="m" />
        <div
          role="region"
          aria-label={i18n.translate('xpack.digitalExperience.sessionDetail.journey.eventsLabel', {
            defaultMessage: 'Events on {page}',
            values: { page: visit.page },
          })}
        >
          <VisitActivity activity={activity} pageUrl={visit.url} />
        </div>
      </EuiPanel>
    </div>
  );
}

/**
 * One card per page visit, in order: the page, how it loaded, its counts and web vitals, and what
 * happened on it as a waterfall of its requests with its clicks, errors and web vitals.
 */
export function PageJourney({
  visits,
  colors,
  filters,
  formatters: { formatDate },
  registerVisit,
}: {
  visits: PageVisitEvents[];
  colors: Map<string, string>;
  filters: ActivityFilters;
  formatters: Formatters;
  /** Lets the waterfall scroll to a visit. */
  registerVisit: (index: number, element: HTMLElement | null) => void;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="digitalExperiencePageJourney">
      {visits.map((visitEvents, index) => (
        <EuiFlexItem key={`${visitEvents.visit.startTime}-${index}`}>
          <VisitCard
            index={index}
            visitEvents={visitEvents}
            color={colors.get(visitEvents.visit.page)}
            filters={filters}
            formatDate={formatDate}
            registerVisit={registerVisit}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
