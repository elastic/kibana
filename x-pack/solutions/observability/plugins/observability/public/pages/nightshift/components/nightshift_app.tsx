/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo, useRef, useState } from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import { BlastRadiusEntities, type BlastRadiusEntity } from './blast_radius_entities';
import { NightshiftTitle } from './nightshift_title';
import { SignificantEventList } from './significant_event_list';
import { SignificantEventStatuses } from './significant_event_statuses';

export interface NightshiftAppProps {
  error?: Error;
  events: SignificantEvent[];
  isLoading: boolean;
  onChatClick?: (event: SignificantEvent) => void;
  onEventClick?: (event: SignificantEvent) => void;
  showAllEventsHref?: string;
}

const NEEDS_ACTION_STATUSES = ['promoted', 'acknowledged'] as const;

const RESOLVED_STATUSES = ['resolved', 'closed', 'demoted'] as const;

const needsActionStatusSet: ReadonlySet<SignificantEventStatus> = new Set(NEEDS_ACTION_STATUSES);
const resolvedStatusSet: ReadonlySet<SignificantEventStatus> = new Set(RESOLVED_STATUSES);

const getEventsWithStatus = (
  events: SignificantEvent[],
  statuses: ReadonlySet<SignificantEventStatus>
): SignificantEvent[] => events.filter(({ status }) => statuses.has(status));

export function NightshiftApp({
  error,
  events,
  isLoading,
  onChatClick,
  onEventClick,
  showAllEventsHref,
}: NightshiftAppProps) {
  const { euiTheme } = useEuiTheme();
  const [activeBlastRadius, setActiveBlastRadius] = useState<string>();
  const needsActionSectionRef = useRef<HTMLElement>(null);
  const resolvedSectionRef = useRef<HTMLElement>(null);

  const needsActionEvents = useMemo(
    () => getEventsWithStatus(events, needsActionStatusSet),
    [events]
  );
  const resolvedEvents = useMemo(() => getEventsWithStatus(events, resolvedStatusSet), [events]);

  const blastRadius = useMemo<BlastRadiusEntity[]>(() => {
    const counts = new Map<string, number>();

    events.forEach(({ stream_names: streamNames }) => {
      streamNames.forEach((name) => {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      });
    });

    return Array.from(counts, ([name, count]) => ({ count, name })).sort(
      (first, second) => second.count - first.count || first.name.localeCompare(second.name)
    );
  }, [events]);

  const selectedBlastRadius = blastRadius.some(({ name }) => name === activeBlastRadius)
    ? activeBlastRadius
    : undefined;

  const visibleNeedsActionEvents = useMemo(
    () =>
      selectedBlastRadius
        ? needsActionEvents.filter(({ stream_names: streamNames }) =>
            streamNames.includes(selectedBlastRadius)
          )
        : needsActionEvents,
    [needsActionEvents, selectedBlastRadius]
  );
  const visibleResolvedEvents = useMemo(
    () =>
      selectedBlastRadius
        ? resolvedEvents.filter(({ stream_names: streamNames }) =>
            streamNames.includes(selectedBlastRadius)
          )
        : resolvedEvents,
    [resolvedEvents, selectedBlastRadius]
  );

  const scrollToSection = (sectionRef: React.RefObject<HTMLElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (error) {
    return (
      <EuiCallOut
        color="danger"
        iconType="warning"
        title={i18n.translate('xpack.observability.nightshift.loadingErrorTitle', {
          defaultMessage: 'Unable to load significant events',
        })}
        css={css`
          margin-top: 28px;
        `}
      >
        <p>
          {i18n.translate('xpack.observability.nightshift.loadingErrorDescription', {
            defaultMessage: 'Refresh the page to try again.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        box-sizing: border-box;
        margin-top: 25px;
        min-height: max-content;
        padding: 40px 0 60px;
      `}
    >
      {needsActionEvents.length > 0 && <NightshiftTitle showAllEventsHref={showAllEventsHref} />}

      <SignificantEventStatuses
        needsActionCount={needsActionEvents.length}
        onNeedsActionClick={() => scrollToSection(needsActionSectionRef)}
        onResolvedClick={() => scrollToSection(resolvedSectionRef)}
        resolvedCount={resolvedEvents.length}
      />

      <BlastRadiusEntities
        entities={blastRadius}
        onSelect={(name) => {
          setActiveBlastRadius((current) => (current === name ? undefined : name));
        }}
        selectedEntity={selectedBlastRadius}
      />

      <EuiFlexItem
        css={css`
          margin-top: ${euiTheme.size.l};
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
          {(isLoading || visibleNeedsActionEvents.length > 0) && (
            <EuiFlexItem>
              <SignificantEventList
                events={visibleNeedsActionEvents}
                isLoading={isLoading}
                onEventClick={onEventClick}
                onChatClick={onChatClick}
                sectionRef={needsActionSectionRef}
                statusColor="danger"
                title={i18n.translate('xpack.observability.nightshift.list.needsActionTitle', {
                  defaultMessage: 'Need action',
                })}
              />
            </EuiFlexItem>
          )}
          {visibleResolvedEvents.length > 0 && (
            <EuiFlexItem>
              <SignificantEventList
                events={visibleResolvedEvents}
                isLoading={isLoading}
                onEventClick={onEventClick}
                onChatClick={onChatClick}
                sectionRef={resolvedSectionRef}
                statusColor="success"
                title={i18n.translate('xpack.observability.nightshift.list.resolvedTitle', {
                  defaultMessage: 'Resolved',
                })}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
