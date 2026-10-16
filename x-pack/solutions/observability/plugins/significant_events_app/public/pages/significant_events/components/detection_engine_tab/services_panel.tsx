/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ServiceDependency,
  ServiceSummary,
} from '@kbn/significant-events-detection-engine-plugin/common';
import React from 'react';

/** Tall enough for about ten services; longer lists scroll so the events stay in view. */
const LIST_MAX_HEIGHT_PX = 520;

interface IServicesPanelProps {
  services: ServiceSummary[];
  dependencies: ServiceDependency[];
  onOpenEvent: (eventId: string) => void;
}

/** One compact line per watched service, troubled ones first. */
export function ServicesPanel({ services, dependencies, onOpenEvent }: IServicesPanelProps) {
  const { euiTheme } = useEuiTheme();
  const troubled = services.filter((service) => service.open_events > 0).length;
  const sorted = [...services].sort(
    (a, b) =>
      Number(b.open_events > 0) - Number(a.open_events > 0) || a.service.localeCompare(b.service)
  );

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="detectionEngineServicesPanel">
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.significantEventsApp.detectionEngine.services.title', {
                defaultMessage: 'Services',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.significantEventsApp.detectionEngine.services.counts', {
              defaultMessage: '{watched} watched · {troubled} with an open event',
              values: { watched: services.length, troubled },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {services.length === 0 && (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.services.empty', {
            defaultMessage:
              'No service measured in the last hour. Enable a source and turn on Auto-run.',
          })}
        </EuiText>
      )}
      <div style={{ maxHeight: LIST_MAX_HEIGHT_PX, overflowY: 'auto', marginTop: 4 }}>
        {sorted.map((summary) => {
          const eventId = summary.open_events > 0 ? summary.last_event_id : undefined;
          const hasEvent = eventId !== undefined;
          const checks = summary.watched_by.reduce((sum, item) => sum + item.series, 0);
          const calls = dependencies
            .filter((dependency) => dependency.source === summary.service)
            .map((dependency) => dependency.target);
          return (
            <div
              key={summary.service}
              data-test-subj={`detectionEngineService-${summary.service}`}
              style={{
                borderLeft: `3px solid ${
                  hasEvent ? euiTheme.colors.borderBaseDanger : euiTheme.colors.borderBaseSuccess
                }`,
                padding: '2px 6px',
                marginBottom: 2,
              }}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiHealth color={hasEvent ? 'danger' : 'success'}>
                    <EuiText size="xs">
                      <strong>{summary.service}</strong>
                    </EuiText>
                  </EuiHealth>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.significantEventsApp.detectionEngine.services.line', {
                      defaultMessage: '{checks} checks · {detections} detections/h',
                      values: { checks, detections: summary.detections_last_hour },
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiText size="xs" color="subdued" style={{ paddingLeft: 16 }}>
                {eventId ? (
                  <EuiLink
                    onClick={() => onOpenEvent(eventId)}
                    data-test-subj={`detectionEngineServiceEvent-${summary.service}`}
                  >
                    {summary.open_events > 1
                      ? i18n.translate(
                          'xpack.significantEventsApp.detectionEngine.services.moreEvents',
                          {
                            defaultMessage: '{title} (+{more} more)',
                            values: {
                              title: summary.last_event_title,
                              more: summary.open_events - 1,
                            },
                          }
                        )
                      : summary.last_event_title}
                  </EuiLink>
                ) : (
                  i18n.translate('xpack.significantEventsApp.detectionEngine.services.healthy', {
                    defaultMessage: 'Nothing above normal',
                  })
                )}
                {calls.length > 0 &&
                  i18n.translate('xpack.significantEventsApp.detectionEngine.services.calls', {
                    defaultMessage: ' · calls {services}',
                    values: { services: calls.join(', ') },
                  })}
              </EuiText>
            </div>
          );
        })}
      </div>
    </EuiPanel>
  );
}
