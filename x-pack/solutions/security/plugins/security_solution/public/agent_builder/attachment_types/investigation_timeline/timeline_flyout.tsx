/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiText,
  EuiTimeline,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InvestigationTimelineEvent } from './types';

export const INVESTIGATION_TIMELINE_FLYOUT_TEST_ID = 'investigationTimelineFlyout';

const TIMELINE_LIST_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.flyoutListAriaLabel',
  { defaultMessage: 'Attack timeline events' }
);

const EVENT_ICON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.eventIconAriaLabel',
  { defaultMessage: 'Event' }
);

export const INVESTIGATION_TIMELINE_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.flyoutTitle',
  { defaultMessage: 'Investigation timeline' }
);

/** ISO-8601 timestamps render with a space before the time, matching the flyout design. */
const formatTimestamp = (timestamp: string): string => timestamp.replace('T', ' ');

export interface InvestigationTimelineFlyoutProps {
  events: InvestigationTimelineEvent[];
}

/** Vertical event list shown when an attack-timeline summary row is opened. */
export const InvestigationTimelineFlyout = ({ events }: InvestigationTimelineFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyoutBody data-test-subj={INVESTIGATION_TIMELINE_FLYOUT_TEST_ID}>
      <EuiTitle size="s" css={css({ marginBottom: euiTheme.size.l })}>
        <h2>{INVESTIGATION_TIMELINE_FLYOUT_TITLE}</h2>
      </EuiTitle>

      {events.length === 0 ? (
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.agentBuilder.investigationTimeline.empty"
            defaultMessage="No events were reconstructed from the available telemetry."
          />
        </EuiText>
      ) : (
        <EuiTimeline
          aria-label={TIMELINE_LIST_ARIA_LABEL}
          gutterSize="l"
          items={events.map((event, index) => ({
            icon: (
              <EuiAvatar
                size="s"
                color="subdued"
                iconType="clock"
                iconSize="s"
                name={EVENT_ICON_ARIA_LABEL}
              />
            ),
            verticalAlign: 'top' as const,
            'data-test-subj': 'investigationTimelineEvent',
            children: (
              <div key={`${event.timestamp}-${event.host}-${index}`}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      css={css({ fontFamily: euiTheme.font.familyCode })}
                    >
                      <span data-test-subj="investigationTimelineEventTimestamp">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow" data-test-subj="investigationTimelineEventHost">
                      {event.host}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText
                  size="xs"
                  css={css({
                    marginTop: euiTheme.size.xs,
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                  })}
                >
                  {event.description}
                </EuiText>
              </div>
            ),
          }))}
        />
      )}
    </EuiFlyoutBody>
  );
};
