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
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineEvent, LabState, ServiceSummary } from '@kbn/significant-events-plugin/common';
import React from 'react';
import { INCIDENT_LABELS } from './labels';

type Health = 'event' | 'incident' | 'healthy';

const HEALTH_COLOR: Record<Health, 'danger' | 'warning' | 'success'> = {
  event: 'danger',
  incident: 'warning',
  healthy: 'success',
};

/** Groups services into columns by how deep they sit in the call graph, callers first. */
function columnsOf(services: string[], dependencies: LabState['dependencies']): string[][] {
  const depthOf = (service: string, seen: Set<string>): number => {
    const callers = dependencies.filter(
      (dependency) => dependency.target === service && !seen.has(dependency.source)
    );
    return callers.length === 0
      ? 0
      : 1 +
          Math.max(
            ...callers.map((dependency) => depthOf(dependency.source, new Set([...seen, service])))
          );
  };
  const depths = services.map((service) => ({ service, depth: depthOf(service, new Set()) }));
  const maxDepth = Math.max(0, ...depths.map((item) => item.depth));
  return Array.from({ length: maxDepth + 1 }, (_, depth) =>
    depths.filter((item) => item.depth === depth).map((item) => item.service)
  );
}

interface ISystemMapProps {
  lab: LabState;
  services: ServiceSummary[];
  events: EngineEvent[];
  onOpenEvent: (eventId: string) => void;
}

/** The watched system, as knowledge describes it, coloured by what the engine sees now. */
export function SystemMap({ lab, services, events, onOpenEvent }: ISystemMapProps) {
  const { euiTheme } = useEuiTheme();
  const names = lab.ready ? lab.services : [...new Set(services.map((summary) => summary.service))];
  const columns = columnsOf(names, lab.ready ? lab.dependencies : []);
  const openEvents = events.filter((event) => event.status !== 'inactive');

  const nodeOf = (service: string) => {
    const event = openEvents.find((item) => item.services.includes(service));
    const incidents = lab.incidents.filter((incident) => incident.service === service);
    const health: Health = event ? 'event' : incidents.length > 0 ? 'incident' : 'healthy';
    const summary = services.find((item) => item.service === service);
    const series = (summary?.watched_by ?? []).reduce((sum, item) => sum + item.series, 0);
    const borderColor =
      health === 'event'
        ? euiTheme.colors.borderBaseDanger
        : health === 'incident'
        ? euiTheme.colors.borderBaseWarning
        : euiTheme.colors.borderBaseSuccess;

    return (
      <EuiPanel
        key={service}
        hasBorder
        paddingSize="s"
        onClick={event ? () => onOpenEvent(event.event_id) : undefined}
        style={{ borderLeft: `4px solid ${borderColor}`, minWidth: 170 }}
        data-test-subj={`detectionEngineMapNode-${service}`}
      >
        <EuiText size="s">
          <strong>{service}</strong>
        </EuiText>
        <EuiHealth color={HEALTH_COLOR[health]}>
          <EuiText size="xs">
            {health === 'event'
              ? event!.title
              : health === 'incident'
              ? i18n.translate('xpack.significantEventsApp.detectionEngine.map.incident', {
                  defaultMessage: 'Lab incident: {kinds}',
                  values: {
                    kinds: incidents.map((incident) => INCIDENT_LABELS[incident.kind]).join(', '),
                  },
                })
              : i18n.translate('xpack.significantEventsApp.detectionEngine.map.healthy', {
                  defaultMessage: 'Nothing above normal',
                })}
          </EuiText>
        </EuiHealth>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.significantEventsApp.detectionEngine.map.watched', {
            defaultMessage: '{series} checks watching · {detections} detections in the last hour',
            values: { series, detections: summary?.detections_last_hour ?? 0 },
          })}
        </EuiText>
      </EuiPanel>
    );
  };

  return (
    <EuiPanel hasBorder data-test-subj="detectionEngineSystemMap">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.significantEventsApp.detectionEngine.map.title', {
            defaultMessage: 'The system it watches',
          })}
        </h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.significantEventsApp.detectionEngine.map.subtitle', {
          defaultMessage:
            'Services and who calls whom, as learned from knowledge indicators. Click a red service to open its event.',
        })}
      </EuiText>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} style={{ marginTop: 12 }}>
        {columns.map((column, index) => (
          <React.Fragment key={column.join('-')}>
            {index > 0 && (
              <EuiFlexItem grow={false}>
                <EuiIcon type="sortRight" color="subdued" size="l" aria-hidden={true} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="column" gutterSize="s">
                {column.map((service) => (
                  <EuiFlexItem key={service} grow={false}>
                    {nodeOf(service)}
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
