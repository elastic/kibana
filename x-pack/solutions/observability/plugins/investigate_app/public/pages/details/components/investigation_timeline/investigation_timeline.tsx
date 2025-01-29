/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import React, { useState } from 'react';
import { EventsTimeline } from './events_timeline/events_timeline';
import { InvestigationTimelineFilterBar } from './investigation_timeline_filter_bar/investigation_timeline_filter_bar';

export function InvestigationTimeline() {
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  return (
    <EuiPanel hasBorder={true} grow={false} paddingSize="xs">
      <EuiFlexGroup direction="column" gutterSize="s">
        <InvestigationTimelineFilterBar
          onEventTypesSelected={(selected: string[]) => setEventTypes(selected)}
        />

        <EventsTimeline eventTypes={eventTypes} />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
