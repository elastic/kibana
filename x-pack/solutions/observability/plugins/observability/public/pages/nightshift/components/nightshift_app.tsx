/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import { BlastRadiusEntities, type BlastRadiusEntity } from './blast_radius_entities';
import { NightshiftTitle } from './nightshift_title';
import { SignificantEventList } from './significant_event_list';
import { SignificantEventStatuses } from './significant_event_statuses';
import { useKibana } from '../../../utils/kibana_react';
import { useFetchSignificantEvents } from '../hooks/use_fetch_significant_events';
import {
  byCriticalityDesc,
  filterEventsByStream,
  getNeedsActionEvents,
  getResolvedEvents,
} from '../significant_event_status';

export function NightshiftApp(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder, application } = useKibana().services;
  const [selectedStreamName, setSelectedStreamName] = useState<string>();
  const needsActionSectionRef = useRef<HTMLElement>(null);
  const resolvedSectionRef = useRef<HTMLElement>(null);

  const { data, error: eventsError, isLoading, refetch } = useFetchSignificantEvents();

  const events = useMemo(() => data?.hits ?? [], [data]);
  const totalCount = data?.total;

  const showAllEventsHref = application.getUrlForApp('streams', {
    deepLinkId: 'significantEventsEvents',
  });

  const handleChatClick = useCallback(
    (event: SignificantEvent) => {
      agentBuilder?.openChat({
        newConversation: true,
        autoSendInitialMessage: true,
        initialMessage: i18n.translate('xpack.observability.nightshift.explainEventPrompt', {
          defaultMessage: 'Explain this significant event: {significantEventName}',
          values: { significantEventName: event.title },
        }),
        attachments: [
          {
            id: event.event_id,
            type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
            origin: event.discovery_slug,
            data: event,
          },
        ],
      });
    },
    [agentBuilder]
  );
  const onChatClick = agentBuilder ? handleChatClick : undefined;

  // Highest-impact events first so SEV1 items are never buried below older, lower-impact ones.
  const needsActionEvents = useMemo(
    () => getNeedsActionEvents(events).sort(byCriticalityDesc),
    [events]
  );
  const resolvedEvents = useMemo(() => getResolvedEvents(events).sort(byCriticalityDesc), [events]);

  // The events we display (excludes dismissed/demoted noise) drive the empty state.
  const shownEvents = useMemo(
    () => [...needsActionEvents, ...resolvedEvents],
    [needsActionEvents, resolvedEvents]
  );

  // Blast radius surfaces only entities that still need action — resolved events are
  // not actionable, so their streams must not appear as chips. Because every chip comes
  // from a needs-action event, selecting one can never filter that list down to nothing.
  // Chips rank by the highest criticality seen on the stream (then event count, then
  // name), so a single SEV1 stream sorts above several low-severity ones.
  const blastRadius = useMemo<BlastRadiusEntity[]>(() => {
    const byStream = new Map<string, { count: number; maxCriticality: number }>();

    needsActionEvents.forEach(({ criticality, stream_names: streamNames }) => {
      (streamNames ?? []).forEach((name) => {
        const current = byStream.get(name) ?? { count: 0, maxCriticality: 0 };
        byStream.set(name, {
          count: current.count + 1,
          maxCriticality: Math.max(current.maxCriticality, criticality),
        });
      });
    });

    return Array.from(byStream, ([name, { count, maxCriticality }]) => ({
      count,
      maxCriticality,
      name,
    }))
      .sort(
        (first, second) =>
          second.maxCriticality - first.maxCriticality ||
          second.count - first.count ||
          first.name.localeCompare(second.name)
      )
      .map(({ count, name }) => ({ count, name }));
  }, [needsActionEvents]);

  const activeStreamName = blastRadius.some(({ name }) => name === selectedStreamName)
    ? selectedStreamName
    : undefined;

  const visibleNeedsActionEvents = useMemo(
    () => filterEventsByStream(needsActionEvents, activeStreamName),
    [needsActionEvents, activeStreamName]
  );
  const visibleResolvedEvents = useMemo(
    () => filterEventsByStream(resolvedEvents, activeStreamName),
    [resolvedEvents, activeStreamName]
  );

  const scrollToSection = (sectionRef: React.RefObject<HTMLElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasEvents = shownEvents.length > 0;
  const hasNeedsAction = visibleNeedsActionEvents.length > 0;
  const isTruncated = typeof totalCount === 'number' && totalCount > events.length;

  // Only treat a load failure as fatal when there is nothing to show; a failed
  // background refetch that still has cached data degrades to a non-blocking warning.
  if (eventsError && !hasEvents && !isLoading) {
    return <LoadingErrorCallout onRetry={() => refetch()} />;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={css`
        box-sizing: border-box;
        margin-top: ${euiTheme.size.l};
        min-height: max-content;
        padding: ${euiTheme.size.xxl} 0 calc(${euiTheme.size.xxl} * 1.5);
      `}
    >
      <NightshiftTitle
        isLoading={isLoading}
        hasNeedsAction={hasNeedsAction}
        showAllEventsHref={showAllEventsHref}
      />

      {isLoading ? (
        <EuiFlexItem
          css={css`
            margin-top: ${euiTheme.size.l};
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            responsive={false}
            css={css`
              min-height: calc(${euiTheme.size.xxl} * 4);
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                size="xl"
                aria-label={i18n.translate('xpack.observability.nightshift.loadingLabel', {
                  defaultMessage: 'Loading significant events',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : !hasEvents ? (
        <>
          {isTruncated && (
            <TruncationNotice count={events.length} total={totalCount ?? events.length} />
          )}
          <EuiFlexItem
            css={css`
              margin-top: ${euiTheme.size.l};
            `}
          >
            <EuiPanel hasBorder hasShadow={false} paddingSize="l" color="subdued">
              <EuiText textAlign="center" color="subdued" size="s">
                <p>
                  {i18n.translate('xpack.observability.nightshift.allClearDescription', {
                    defaultMessage:
                      'No significant events were detected. Nothing needs your attention.',
                  })}
                </p>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </>
      ) : (
        <>
          {eventsError && (
            <EuiFlexItem
              css={css`
                margin-top: ${euiTheme.size.m};
              `}
            >
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                size="s"
                title={i18n.translate('xpack.observability.nightshift.refreshWarningTitle', {
                  defaultMessage: 'Showing the last loaded results; refreshing failed.',
                })}
              >
                <EuiButtonEmpty
                  color="warning"
                  data-test-subj="nightshiftRefreshRetryButton"
                  flush="left"
                  iconType="refresh"
                  onClick={() => refetch()}
                  size="s"
                >
                  {i18n.translate('xpack.observability.nightshift.retryButtonText', {
                    defaultMessage: 'Retry',
                  })}
                </EuiButtonEmpty>
              </EuiCallOut>
            </EuiFlexItem>
          )}

          <SignificantEventStatuses
            needsActionCount={visibleNeedsActionEvents.length}
            onNeedsActionClick={() => scrollToSection(needsActionSectionRef)}
            onResolvedClick={() => scrollToSection(resolvedSectionRef)}
            resolvedCount={visibleResolvedEvents.length}
          />

          <BlastRadiusEntities
            entities={blastRadius}
            onSelect={(name) => {
              setSelectedStreamName((current) => (current === name ? undefined : name));
            }}
            selectedEntity={activeStreamName}
          />

          {isTruncated && (
            <TruncationNotice count={events.length} total={totalCount ?? events.length} />
          )}

          <EuiFlexItem
            css={css`
              margin-top: ${euiTheme.size.l};
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="l" responsive={false}>
              {visibleNeedsActionEvents.length > 0 && (
                <EuiFlexItem>
                  <SignificantEventList
                    events={visibleNeedsActionEvents}
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
        </>
      )}
    </EuiFlexGroup>
  );
}

function TruncationNotice({ count, total }: { count: number; total: number }): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${euiTheme.size.m};
      `}
    >
      <EuiText color="subdued" size="xs">
        <p>
          {i18n.translate('xpack.observability.nightshift.truncatedResultsDescription', {
            defaultMessage:
              'Showing {count} of {total} significant events. Open “Show all events” to see the rest.',
            values: { count, total },
          })}
        </p>
      </EuiText>
    </EuiFlexItem>
  );
}

function LoadingErrorCallout({ onRetry }: { onRetry: () => void }): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCallOut
      color="danger"
      iconType="warning"
      announceOnMount
      title={i18n.translate('xpack.observability.nightshift.loadingErrorTitle', {
        defaultMessage: 'Unable to load significant events',
      })}
      css={css`
        margin-top: ${euiTheme.size.l};
      `}
    >
      <EuiButton
        color="danger"
        data-test-subj="nightshiftLoadingErrorRetryButton"
        iconType="refresh"
        onClick={onRetry}
        size="s"
      >
        {i18n.translate('xpack.observability.nightshift.retryButtonText', {
          defaultMessage: 'Retry',
        })}
      </EuiButton>
    </EuiCallOut>
  );
}
