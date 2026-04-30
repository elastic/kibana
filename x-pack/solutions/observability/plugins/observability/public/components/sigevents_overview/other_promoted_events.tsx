/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LatestSignificantEventData } from '../../hooks/use_fetch_latest_significant_event';

export interface OtherPromotedEventsProps {
  events: LatestSignificantEventData[];
}

const getSeverityBadgeColor = (
  color: LatestSignificantEventData['severityColor']
): 'warning' | 'primary' | 'default' | 'danger' => {
  switch (color) {
    case 'danger':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'primary':
      return 'primary';
    case 'subdued':
    default:
      return 'default';
  }
};

export function OtherPromotedEvents({ events }: OtherPromotedEventsProps) {
  const { euiTheme } = useEuiTheme();

  const panelCss = css`
    padding: ${euiTheme.size.m};
  `;

  return (
    <div data-test-subj="sigeventsOverviewOtherPromotedEvents">
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.observability.sigeventsOverview.otherPromotedEvents.title', {
          defaultMessage: 'Other promoted events',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {events.map((event) => (
          <EuiFlexItem key={event.raw.event_id}>
            <EuiPanel css={panelCss} hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={getSeverityBadgeColor(event.severityColor)}>
                    {event.severityLabel}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxxs">
                    <h4>{event.mainEventTitle}</h4>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              {event.description && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued">
                    {event.description}
                  </EuiText>
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}
