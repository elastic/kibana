/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { getMaybeDate } from '../../../common/components/formatted_date/maybe_date';
import { parseTimelineEvents, parseTimelineWindow } from './parse_timeline_events';
import { TimelineTimestamp } from './timeline_timestamp';
import { TimelineWindowNote } from './timeline_window_note';
import type { InvestigationTimelineEvent } from './types';

export const INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID =
  'securitySolutionAgentBuilderInvestigationTimelineAttachment';

interface TimelineRow extends InvestigationTimelineEvent {
  id: string;
}

const TIMESTAMP_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.timestampColumn',
  { defaultMessage: 'Timestamp' }
);
const HOST_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.hostColumn',
  { defaultMessage: 'Host' }
);
const COMMENT_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.commentColumn',
  { defaultMessage: 'Comment' }
);

const wrappingCellCss = css`
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

// The chat column is a flex item. Without a shrinkable min size, the table's
// min-content width wins and the row paints past the chat.
const containedCss = css`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

/** A timeline with fewer events than this opens expanded; longer ones start collapsed. */
export const COLLAPSE_AT_EVENT_COUNT = 5;

const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.tableCaption',
  { defaultMessage: 'Attack timeline events' }
);

/**
 * Earliest and latest timestamps by time, not position: events keep the order the agent sent.
 * A timestamp that does not parse cannot be ordered, so it is skipped; when none parse, the
 * first and last events stand in.
 */
export const getTimelineSpan = (
  events: InvestigationTimelineEvent[]
): { first: string; last: string } => {
  const dated = events.flatMap(({ timestamp }) => {
    const date = getMaybeDate(timestamp);
    return date.isValid() ? [{ timestamp, time: date.valueOf() }] : [];
  });
  if (dated.length === 0) {
    return { first: events[0].timestamp, last: events[events.length - 1].timestamp };
  }
  const [first, last] = dated.reduce(
    ([min, max], entry) => [
      entry.time < min.time ? entry : min,
      entry.time > max.time ? entry : max,
    ],
    [dated[0], dated[0]]
  );
  return { first: first.timestamp, last: last.timestamp };
};

/** Event count with the earliest and latest timestamps, so a collapsed timeline still says what it spans. */
const TimelineSummary: React.FC<{ events: InvestigationTimelineEvent[] }> = ({ events }) => {
  const { euiTheme } = useEuiTheme();
  const summaryCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;
  const span = getTimelineSpan(events);
  const first = <TimelineTimestamp value={span.first} showRawOnHover={false} />;
  if (events.length === 1) {
    return (
      <EuiText size="s" css={summaryCss} data-test-subj="investigationTimelineSummary">
        <FormattedMessage
          id="xpack.securitySolution.agentBuilder.investigationTimeline.summarySingle"
          defaultMessage="Forensic timeline: 1 event at {timestamp}"
          values={{ timestamp: first }}
        />
      </EuiText>
    );
  }
  return (
    <EuiText size="s" css={summaryCss} data-test-subj="investigationTimelineSummary">
      <FormattedMessage
        id="xpack.securitySolution.agentBuilder.investigationTimeline.summaryRange"
        defaultMessage="Forensic timeline: {count} events from {first} to {last}"
        values={{
          count: events.length,
          first,
          last: <TimelineTimestamp value={span.last} showRawOnHover={false} />,
        }}
      />
    </EuiText>
  );
};

/**
 * Chronological event table for a `security.investigation.timeline` attachment, collapsed
 * behind a one-line summary so a long timeline does not take over the chat.
 */
export const InvestigationTimelineInlineContent: React.FC<
  AttachmentRenderProps<Attachment<string, unknown>>
> = ({ attachment }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationTimeline' });
  const events = useMemo(() => parseTimelineEvents(attachment.data), [attachment.data]);
  const window = useMemo(() => parseTimelineWindow(attachment.data), [attachment.data]);
  const items = useMemo<TimelineRow[]>(
    () =>
      events.map((event, index) => ({
        ...event,
        id: `${event.timestamp}-${event.host}-${index}`,
      })),
    [events]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<TimelineRow>>>(
    () => [
      {
        field: 'timestamp',
        name: TIMESTAMP_COLUMN,
        width: '14em',
        render: (timestamp: string) => (
          <EuiText size="s" css={wrappingCellCss}>
            <TimelineTimestamp value={timestamp} data-test-subj="investigationTimelineTimestamp" />
          </EuiText>
        ),
      },
      {
        field: 'host',
        name: HOST_COLUMN,
        width: '10em',
        render: (host: string) => (
          <EuiText size="s" css={wrappingCellCss}>
            {host}
          </EuiText>
        ),
      },
      {
        field: 'description',
        name: COMMENT_COLUMN,
        render: (description: string) => (
          <EuiText size="s" css={wrappingCellCss}>
            {description}
          </EuiText>
        ),
      },
    ],
    []
  );

  if (items.length === 0) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        data-test-subj={INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.agentBuilder.investigationTimeline.empty"
            defaultMessage="No events were reconstructed from the available telemetry."
          />
        </EuiText>
        {window ? (
          <>
            <EuiSpacer size="xs" />
            <TimelineWindowNote window={window} />
          </>
        ) : null}
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      css={containedCss}
      data-test-subj={INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID}
    >
      {window ? (
        <>
          <TimelineWindowNote window={window} />
          <EuiSpacer size="xs" />
        </>
      ) : null}
      <EuiAccordion
        id={accordionId}
        buttonContent={<TimelineSummary events={events} />}
        buttonProps={{ 'data-test-subj': 'investigationTimelineToggle' }}
        initialIsOpen={events.length < COLLAPSE_AT_EVENT_COUNT}
        paddingSize="none"
        data-test-subj="investigationTimelineAccordion"
      >
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={TABLE_CAPTION}
          items={items}
          columns={columns}
          itemId="id"
          // Fixed layout keeps the table at the chat width. Auto layout sizes the
          // comment column to the longest description and the row overruns the chat.
          tableLayout="fixed"
          css={containedCss}
          responsiveBreakpoint={false}
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
