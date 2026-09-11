/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, EuiPanel, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { SecurityAgentBuilderAttachments } from '../../../../common/constants';

export const INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID =
  'securitySolutionAgentBuilderInvestigationTimelineAttachment';

export interface InvestigationTimelineEvent {
  timestamp: string;
  host: string;
  description: string;
}

export type InvestigationTimelineAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.investigationTimeline,
  InvestigationTimelineEvent[]
>;

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

const isTimelineEvent = (value: unknown): value is InvestigationTimelineEvent => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const event = value as { timestamp?: unknown; host?: unknown; description?: unknown };
  return (
    typeof event.timestamp === 'string' &&
    event.timestamp !== '' &&
    typeof event.host === 'string' &&
    event.host !== '' &&
    typeof event.description === 'string' &&
    event.description !== ''
  );
};

export const parseTimelineEvents = (data: unknown): InvestigationTimelineEvent[] =>
  Array.isArray(data) ? data.filter(isTimelineEvent) : [];

const wrappingCellCss = css`
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.tableCaption',
  { defaultMessage: 'Attack timeline events' }
);

/**
 * Chronological event table for a `security.investigation.timeline` attachment.
 */
export const InvestigationTimelineInlineContent: React.FC<
  AttachmentRenderProps<Attachment<string, unknown>>
> = ({ attachment }) => {
  const events = useMemo(() => parseTimelineEvents(attachment.data), [attachment.data]);
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
        width: '12em',
        render: (timestamp: string) => (
          <EuiText size="s" css={wrappingCellCss}>
            {timestamp}
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
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      data-test-subj={INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID}
    >
      <EuiBasicTable
        tableCaption={TABLE_CAPTION}
        items={items}
        columns={columns}
        itemId="id"
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </EuiPanel>
  );
};
