/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { Investigation } from '@kbn/pnd-common';

export const TimelineEventItem = memo<{
  event: Investigation['events'][number];
  showRelativeTime?: boolean;
}>(({ event, showRelativeTime = false }) => (
  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
    <EuiFlexItem>
      <EuiText size="xs" style={{ fontWeight: 600 }}>
        <p>{event.summary}</p>
      </EuiText>
      {event.actor && (
        <EuiText size="xs" color="subdued">
          <p>{event.actor}</p>
        </EuiText>
      )}
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {showRelativeTime ? (
          <FormattedRelative value={event.timestamp} />
        ) : (
          new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        )}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
));

TimelineEventItem.displayName = 'TimelineEventItem';
