/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { AttachmentSummaryGroup, AttachmentSummaryRow } from '@kbn/agentic-investigations-common';
import { parseTimelineEvents } from './parse_timeline_events';

const TIMELINE_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationTimeline.summaryTitle',
  { defaultMessage: 'Attack timeline' }
);

const timelineEventIconLabel = (timestamp: string, host: string) =>
  i18n.translate('xpack.securitySolution.agentBuilder.investigationTimeline.eventIconTooltip', {
    defaultMessage: '{timestamp} on {host}',
    values: { timestamp, host },
  });

/** Read-only attack-timeline section for the investigation flyout summary. */
export const renderInvestigationTimelineSummary = (attachment: { data?: unknown }): ReactNode => {
  const events = parseTimelineEvents(attachment.data);
  if (events.length === 0) {
    return null;
  }

  const rows = events.map((event, index) => (
    <AttachmentSummaryRow
      key={`${event.timestamp}-${event.host}-${index}`}
      label={event.description}
      typeName={TIMELINE_TITLE}
      iconType="timeline"
      iconLabel={timelineEventIconLabel(event.timestamp, event.host)}
    />
  ));

  return <AttachmentSummaryGroup title={TIMELINE_TITLE} rows={rows} />;
};
