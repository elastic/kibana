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

/** ISO-8601 timestamps render with a space before the time, matching the flyout design. */
const formatTimestamp = (timestamp: string): string => timestamp.replace('T', ' ');

export interface InvestigationTimelineFlyoutProps {
  title: string;
  events: InvestigationTimelineEvent[];
}

/** Vertical event list shown when an attack-timeline summary row is opened. */
export const InvestigationTimelineFlyout = ({
  title,
  events,
}: InvestigationTimelineFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  if (events.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj={INVESTIGATION_TIMELINE_FLYOUT_TEST_ID}>
        <FormattedMessage
          id="xpack.securitySolution.agentBuilder.investigationTimeline.empty"
          defaultMessage="No events were reconstructed from the available telemetry."
        />
      </EuiText>
    );
  }

  return (
    <div data-test-subj={INVESTIGATION_TIMELINE_FLYOUT_TEST_ID}>
      <EuiTitle size="xs" css={css({ marginBottom: euiTheme.size.l })}>
        <h2>{title}</h2>
      </EuiTitle>

      <EuiTimeline
        aria-label={TIMELINE_LIST_ARIA_LABEL}
        gutterSize="l"
        items={events.map((event, index) => ({
          icon: 'clock',
          iconAriaLabel: EVENT_ICON_ARIA_LABEL,
          verticalAlign: 'top' as const,
          'data-test-subj': 'investigationTimelineEvent',
          children: (
            <div key={`${event.timestamp}-${event.host}-${index}`}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" css={css({ fontWeight: euiTheme.font.weight.semiBold })}>
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
                size="s"
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
    </div>
  );
};
