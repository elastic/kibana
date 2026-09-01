/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiTimeline, EuiTimelineItem, type IconType } from '@elastic/eui';
import { type Investigation, type TimelineEvent } from '@kbn/pnd-common';
import { TimelineEventItem } from './timeline_event';

const EVENT_TYPE_ICONS: Record<TimelineEvent['type'], IconType> = {
  action: 'play',
  escalation: 'arrowUp',
  corroboration: 'paperClip',
  sweep: 'inspect',
  triage: 'flag',
};

const getEventIcon = (type: TimelineEvent['type']): IconType => EVENT_TYPE_ICONS[type] ?? 'dot';

export const TimelineEventList = memo<{ events: Investigation['events'] }>(({ events }) => (
  <EuiTimeline>
    {events.map((event, index) => (
      <EuiTimelineItem
        key={event.id}
        icon={getEventIcon(event.type)}
        color="subdued"
        aria-label={event.type}
      >
        <TimelineEventItem event={event} showRelativeTime={index === 0} />
      </EuiTimelineItem>
    ))}
  </EuiTimeline>
));

TimelineEventList.displayName = 'TimelineEventList';
