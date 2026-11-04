/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SessionSummary as Session } from '../../../../common/sessions';
import type { Formatters } from '../../../hooks/use_formatters';
import { formatSessionDuration } from '../../../utils/format_session_duration';
import { clientOf, locationOf } from '../../../utils/describe_session';
import { WebVitalBadges } from '../../../components/web_vital_badges';
import { ANONYMOUS_USER } from '../../../labels';

const UNKNOWN = i18n.translate('xpack.digitalExperience.sessionDetail.summary.unknownValue', {
  defaultMessage: 'Unknown',
});

/** The session's totals, who and what it ran on, and its Core Web Vitals. */
export function SessionSummary({
  session,
  formatters: { formatDate, formatNumber },
}: {
  session: Session;
  formatters: Formatters;
}) {
  const stats = [
    {
      id: 'duration',
      title: formatSessionDuration(session.durationMs),
      description: i18n.translate('xpack.digitalExperience.sessionDetail.summary.durationLabel', {
        defaultMessage: 'Duration',
      }),
    },
    {
      id: 'pages',
      title: formatNumber(session.pageViewCount),
      description: i18n.translate('xpack.digitalExperience.sessionDetail.summary.pagesLabel', {
        defaultMessage: 'Page views',
      }),
    },
    {
      id: 'clicks',
      title: formatNumber(session.clickCount),
      description: i18n.translate('xpack.digitalExperience.sessionDetail.summary.clicksLabel', {
        defaultMessage: 'Clicks',
      }),
    },
    {
      id: 'errors',
      title: formatNumber(session.errorCount),
      titleColor: session.errorCount > 0 ? ('danger' as const) : undefined,
      description: i18n.translate('xpack.digitalExperience.sessionDetail.summary.errorsLabel', {
        defaultMessage: 'Errors',
      }),
    },
  ];

  const metadata = [
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.summary.startTimeLabel', {
        defaultMessage: 'Started',
      }),
      description: formatDate(session.startTime),
    },
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.summary.endTimeLabel', {
        defaultMessage: 'Last activity',
      }),
      description: formatDate(session.endTime),
    },
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.summary.userLabel', {
        defaultMessage: 'User',
      }),
      description: session.user ?? ANONYMOUS_USER,
    },
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.summary.clientLabel', {
        defaultMessage: 'Browser and OS',
      }),
      description: clientOf(session) || UNKNOWN,
    },
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.summary.locationLabel', {
        defaultMessage: 'Location',
      }),
      description: locationOf(session) ?? UNKNOWN,
    },
    {
      title: i18n.translate('xpack.digitalExperience.sessionDetail.summary.entryExitLabel', {
        defaultMessage: 'Entry and exit pages',
      }),
      description: [session.entryPage ?? UNKNOWN, session.exitPage ?? UNKNOWN].join(' → '),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="digitalExperienceSessionSummary">
      <EuiFlexGroup gutterSize="l" wrap responsive={false}>
        {stats.map(({ id, title, titleColor, description }) => (
          <EuiFlexItem key={id} grow={false} css={{ minWidth: 120 }}>
            <EuiStat
              data-test-subj={`digitalExperienceSessionStat-${id}`}
              title={title}
              titleColor={titleColor}
              titleSize="s"
              description={description}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
      <EuiDescriptionList
        data-test-subj="digitalExperienceSessionMetadata"
        type="responsiveColumn"
        compressed
        listItems={metadata}
      />
      <WebVitalsSection session={session} />
    </EuiPanel>
  );
}

const WebVitalsSection = ({ session }: { session: Session }) =>
  Object.values(session.webVitals).some((value) => value !== null) ? (
    <>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.digitalExperience.sessionDetail.summary.webVitalsLabel', {
          defaultMessage: 'Core Web Vitals',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <WebVitalBadges
        webVitals={session.webVitals}
        data-test-subj="digitalExperienceSessionVitals"
      />
    </>
  ) : null;
