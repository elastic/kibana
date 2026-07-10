/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import { SignificantEventList } from './significant_event_list';

export type StatusFilter = 'needsAction' | 'resolved';

export interface NightshiftAppProps {
  events: SignificantEvent[];
  isLoading: boolean;
  onEventClick?: (event: SignificantEvent) => void;
}

const NEEDS_ACTION_STATUSES: SignificantEventStatus[] = ['promoted', 'acknowledged'];
const RESOLVED_STATUSES: SignificantEventStatus[] = ['resolved', 'closed', 'demoted'];

export function NightshiftApp({ events, isLoading, onEventClick }: NightshiftAppProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('needsAction');

  const counts = useMemo(() => {
    const needsAction = events.filter((e) => NEEDS_ACTION_STATUSES.includes(e.status)).length;
    const resolved = events.filter((e) => RESOLVED_STATUSES.includes(e.status)).length;
    return { needsAction, resolved };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const statuses = activeFilter === 'needsAction' ? NEEDS_ACTION_STATUSES : RESOLVED_STATUSES;
    return events.filter((e) => statuses.includes(e.status));
  }, [events, activeFilter]);

  const blastRadius = useMemo(() => {
    const entityCounts = new Map<string, number>();
    for (const event of filteredEvents) {
      for (const streamName of event.stream_names) {
        entityCounts.set(streamName, (entityCounts.get(streamName) ?? 0) + 1);
      }
    }
    return [...entityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filteredEvents]);

  const needsActionCount = counts.needsAction;

  return (
    <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
      {needsActionCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xl" />
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="bellSlash" size="xl" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('xpack.nightshift.hero.title', {
                    defaultMessage:
                      '{count} significant {count, plural, one {event} other {events}} need action',
                    values: { count: needsActionCount },
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xl" />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false} style={{ width: '100%', maxWidth: 640 }}>
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.nightshift.summary.title', {
                    defaultMessage: 'Significant events',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink data-test-subj="o11yNightshiftAppShowAllLink">
                {i18n.translate('xpack.nightshift.summary.showAll', {
                  defaultMessage: 'Show all',
                })}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                hasShadow={false}
                paddingSize="m"
                color={activeFilter === 'needsAction' ? 'plain' : 'subdued'}
                onClick={() => setActiveFilter('needsAction')}
                style={{ cursor: 'pointer' }}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.nightshift.summary.needAction', {
                    defaultMessage: 'Need action',
                  })}
                </EuiText>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="danger" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="m">
                      <span>{counts.needsAction}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                hasShadow={false}
                paddingSize="m"
                color={activeFilter === 'resolved' ? 'plain' : 'subdued'}
                onClick={() => setActiveFilter('resolved')}
                style={{ cursor: 'pointer' }}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.nightshift.summary.resolved', {
                    defaultMessage: 'Resolved',
                  })}
                </EuiText>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="success" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="m">
                      <span>{counts.resolved}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          {blastRadius.length > 0 && (
            <>
              <EuiSpacer size="l" />
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate('xpack.nightshift.blastRadius.title', {
                    defaultMessage: 'Blast radius',
                  })}
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {blastRadius.slice(0, 6).map(({ name, count }) => (
                  <EuiFlexItem grow={false} key={name}>
                    <EuiBadge color="hollow">
                      {name} {count}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
                {blastRadius.length > 6 && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">+{blastRadius.length - 6}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>

        <EuiSpacer size="m" />

        <SignificantEventList
          events={filteredEvents}
          isLoading={isLoading}
          onEventClick={onEventClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
