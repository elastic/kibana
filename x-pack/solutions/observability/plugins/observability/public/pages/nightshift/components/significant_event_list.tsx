/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SignificantEventItem } from './significant_event_item';

export interface SignificantEventListProps {
  events: SignificantEvent[];
  isLoading: boolean;
  onEventClick?: (event: SignificantEvent) => void;
}

export function SignificantEventList({
  events,
  isLoading,
  onEventClick,
}: SignificantEventListProps) {
  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (events.length === 0) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="l" color="subdued">
        <EuiText textAlign="center" color="subdued" size="s">
          <p>
            {i18n.translate('xpack.nightshift.list.empty', {
              defaultMessage: 'No significant events found',
            })}
          </p>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {events.map((event) => (
        <EuiFlexItem key={event.event_id}>
          <SignificantEventItem event={event} onClick={onEventClick} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
