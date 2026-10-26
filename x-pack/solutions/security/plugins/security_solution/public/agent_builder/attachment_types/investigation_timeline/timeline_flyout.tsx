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
import { TIMELINE_TITLE } from '../grouped_attachments';
import { TimelineTimestamp } from './timeline_timestamp';
import { TimelineWindowNote } from './timeline_window_note';
import type { InvestigationTimelineEvent, InvestigationTimelineWindow } from './types';

export const INVESTIGATION_TIMELINE_FLYOUT_TEST_ID = 'investigationTimelineFlyout';

const TIMELINE_LIST_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.flyoutListAriaLabel',
  { defaultMessage: 'Attack timeline events' }
);

const EVENT_ICON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.eventIconAriaLabel',
  { defaultMessage: 'Event' }
);

export interface InvestigationTimelineFlyoutProps {
  events: InvestigationTimelineEvent[];
  window?: InvestigationTimelineWindow;
}

/** Vertical event list shown when an attack-timeline summary row is opened. */
export const InvestigationTimelineFlyout = ({
  events,
  window,
}: InvestigationTimelineFlyoutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlyoutBody data-test-subj={INVESTIGATION_TIMELINE_FLYOUT_TEST_ID}>
      <EuiTitle size="s" css={css({ marginBottom: window ? euiTheme.size.s : euiTheme.size.l })}>
        <h2>{TIMELINE_TITLE}</h2>
      </EuiTitle>

      {window ? (
        <div css={css({ marginBottom: euiTheme.size.l })}>
          <TimelineWindowNote window={window} />
        </div>
      ) : null}

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
                      <TimelineTimestamp
                        value={event.timestamp}
                        data-test-subj="investigationTimelineEventTimestamp"
                      />
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
