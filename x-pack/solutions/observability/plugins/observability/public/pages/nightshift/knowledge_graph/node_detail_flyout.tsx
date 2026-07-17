/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type {
  FixtureDetection,
  FixtureFeature,
  FixtureQuery,
  FixtureSignificantEvent,
} from '../fixtures';

export interface NearbyEvent extends FixtureSignificantEvent {
  viaNodeId: string;
  hopDistance: number;
}

interface NodeDetailFlyoutProps {
  feature: FixtureFeature;
  queries: FixtureQuery[];
  detections: FixtureDetection[];
  significantEvents: FixtureSignificantEvent[];
  nearbyEvents?: NearbyEvent[];
  connectedFeatures: FixtureFeature[];
  correlatedNodeIds?: Set<string>;
  sharedEventIds?: Set<string>;
  sharedDetectionIds?: Set<string>;
  onClose: () => void;
  onNavigateToNode: (featureId: string) => void;
  onEventClick?: (event: FixtureSignificantEvent) => void;
}

function SectionHeader({ icon, title, count, color }: {
  icon: string;
  title: string;
  count: number;
  color: string;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} size="m" color={color} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: ${color};
          `}
        >
          {title}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          color="hollow"
          css={css`
            min-width: 22px;
            text-align: center;
          `}
        >
          {count}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function EventCard({ event, onClick, isShared }: { event: FixtureSignificantEvent; onClick?: () => void; isShared?: boolean }) {
  const { euiTheme } = useEuiTheme();
  const isActive = event.status === 'promoted' || event.status === 'acknowledged';
  const statusColor = isActive ? euiTheme.colors.danger : euiTheme.colors.subduedText;

  return (
    <div
      onClick={onClick}
      css={css`
        padding: 12px;
        border-left: 3px solid ${isShared ? euiTheme.colors.accent : statusColor};
        background: ${isShared ? `${euiTheme.colors.accent}15` : euiTheme.colors.lightestShade};
        border-radius: 0 6px 6px 0;
        margin-bottom: 8px;
        cursor: ${onClick ? 'pointer' : 'default'};
        transition: background 0.15s ease;
        &:hover {
          background: ${onClick ? euiTheme.colors.lightShade : euiTheme.colors.lightestShade};
        }
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" css={css`font-weight: 600;`}>{event.title}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={isActive ? 'danger' : 'default'}>
            {event.status}
          </EuiBadge>
        </EuiFlexItem>
        {isShared && (
          <EuiFlexItem grow={false}>
            <EuiIcon type="link" size="s" color="accent" css={css`margin-left: 4px;`} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued" css={css`margin-top: 4px;`}>
        {event.summary.length > 100 ? event.summary.slice(0, 100) + '…' : event.summary}
      </EuiText>
      <EuiFlexGroup gutterSize="xs" responsive={false} css={css`margin-top: 6px;`}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={event.criticality >= 80 ? 'danger' : event.criticality >= 50 ? 'warning' : 'subdued'}>
            <EuiText size="xs">criticality {event.criticality}</EuiText>
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

function DetectionCard({ detection, isShared }: { detection: FixtureDetection; isShared?: boolean }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: 10px 12px;
        border-left: 3px solid ${isShared ? euiTheme.colors.accent : euiTheme.colors.warning};
        background: ${isShared ? `${euiTheme.colors.accent}15` : euiTheme.colors.lightestShade};
        border-radius: 0 6px 6px 0;
        margin-bottom: 6px;
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" css={css`font-weight: 500;`}>{detection.rule_name}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{detection.change_point_type}</EuiBadge>
        </EuiFlexItem>
        {isShared && (
          <EuiFlexItem grow={false}>
            <EuiIcon type="link" size="s" color="accent" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued" css={css`margin-top: 3px;`}>
        {new Date(detection.timestamp).toLocaleString()} · p={detection.p_value.toFixed(4)}
      </EuiText>
    </div>
  );
}

function QueryCard({ query }: { query: FixtureQuery }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: 8px 12px;
        background: ${euiTheme.colors.lightestShade};
        border-radius: 6px;
        margin-bottom: 6px;
        border: 1px solid ${euiTheme.colors.lightShade};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">{query.title}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={query.rule_backed ? 'primary' : 'hollow'}>{query.type}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

function CollapsibleSection({ icon, title, color, items, emptyMessage, renderItem }: {
  icon: string;
  title: string;
  color: string;
  items: unknown[];
  emptyMessage: string;
  renderItem: (item: unknown, index: number) => React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 5);
  const hiddenCount = items.length - 5;

  return (
    <>
      <SectionHeader icon={icon} title={title} count={items.length} color={color} />
      <EuiSpacer size="s" />
      {items.length > 0 ? (
        <>
          {visible.map((item, i) => renderItem(item, i))}
          {!showAll && hiddenCount > 0 && (
            <EuiLink onClick={() => setShowAll(true)} css={css`font-size: 11px; display: block; margin-top: 4px;`}>
              Show all {items.length}
            </EuiLink>
          )}
          {showAll && hiddenCount > 0 && (
            <EuiLink onClick={() => setShowAll(false)} css={css`font-size: 11px; display: block; margin-top: 4px;`}>
              Collapse
            </EuiLink>
          )}
        </>
      ) : (
        <EuiText size="xs" color="subdued" css={css`padding-left: 4px; margin-bottom: 8px;`}>
          {emptyMessage}
        </EuiText>
      )}
    </>
  );
}

function SignificantEventsSection({ events, onEventClick, sharedEventIds }: { events: FixtureSignificantEvent[]; onEventClick?: (event: FixtureSignificantEvent) => void; sharedEventIds?: Set<string> }) {
  const { euiTheme } = useEuiTheme();
  const [showAll, setShowAll] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const activeEvents = events
    .filter((e) => e.status !== 'resolved')
    .sort((a, b) => {
      const aShared = sharedEventIds?.has(a.event_id) ? 0 : 1;
      const bShared = sharedEventIds?.has(b.event_id) ? 0 : 1;
      return aShared - bShared;
    });
  const resolvedEvents = events.filter((e) => e.status === 'resolved');

  const visibleActive = showAll ? activeEvents : activeEvents.slice(0, 5);
  const hiddenCount = activeEvents.length - 5;

  return (
    <>
      <SectionHeader
        icon="alert"
        title="Significant Events"
        count={events.length}
        color={euiTheme.colors.danger}
      />
      <EuiSpacer size="s" />
      {visibleActive.length > 0 ? (
        visibleActive.map((event, i) => (
          <EventCard key={i} event={event} onClick={onEventClick ? () => onEventClick(event) : undefined} isShared={sharedEventIds?.has(event.event_id)} />
        ))
      ) : resolvedEvents.length === 0 ? (
        <EuiText size="xs" color="subdued" css={css`padding-left: 4px; margin-bottom: 8px;`}>
          No significant events linked to this indicator.
        </EuiText>
      ) : null}
      {!showAll && hiddenCount > 0 && (
        <EuiLink
          onClick={() => setShowAll(true)}
          css={css`font-size: 11px; display: block; margin-top: 4px;`}
        >
          Show all {activeEvents.length} events
        </EuiLink>
      )}
      {showAll && hiddenCount > 0 && (
        <EuiLink
          onClick={() => setShowAll(false)}
          css={css`font-size: 11px; display: block; margin-top: 4px;`}
        >
          Collapse
        </EuiLink>
      )}
      {resolvedEvents.length > 0 && (
        <div css={css`margin-top: 8px;`}>
          <EuiLink
            onClick={() => setShowResolved(!showResolved)}
            css={css`font-size: 11px;`}
          >
            {showResolved ? 'Hide' : 'Show'} {resolvedEvents.length} resolved
          </EuiLink>
          {showResolved && (
            <div css={css`margin-top: 8px; opacity: 0.7;`}>
              {resolvedEvents.map((event, i) => (
                <EventCard key={i} event={event} onClick={onEventClick ? () => onEventClick(event) : undefined} isShared={sharedEventIds?.has(event.event_id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NearbyEventsSection({ events, onEventClick, onNavigateToNode }: {
  events: NearbyEvent[];
  onEventClick?: (event: FixtureSignificantEvent) => void;
  onNavigateToNode: (featureId: string) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? events : events.slice(0, 5);
  const hiddenCount = events.length - 5;

  return (
    <div css={css`margin-top: 16px;`}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="branch" size="s" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" css={css`font-weight: 600; color: ${euiTheme.colors.subduedText};`}>
            Nearby ({events.length})
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <div css={css`opacity: 0.75;`}>
        {visible.map((event, i) => (
          <div key={i} css={css`position: relative;`}>
            <EventCard
              event={event}
              onClick={onEventClick ? () => onEventClick(event) : undefined}
            />
            <button
              onClick={(e) => { e.stopPropagation(); onNavigateToNode(event.viaNodeId); }}
              css={css`
                position: absolute;
                bottom: 12px;
                right: 12px;
                font-size: 10px;
                color: ${euiTheme.colors.primaryText};
                background: ${euiTheme.colors.lightestShade};
                border: 1px solid ${euiTheme.colors.lightShade};
                border-radius: 10px;
                padding: 2px 8px;
                cursor: pointer;
                transition: background 0.15s ease;
                &:hover {
                  background: ${euiTheme.colors.lightShade};
                }
              `}
            >
              via {event.viaNodeId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 18)}
            </button>
          </div>
        ))}
      </div>
      {!showAll && hiddenCount > 0 && (
        <EuiLink onClick={() => setShowAll(true)} css={css`font-size: 11px; display: block; margin-top: 4px;`}>
          Show all {events.length} nearby
        </EuiLink>
      )}
      {showAll && hiddenCount > 0 && (
        <EuiLink onClick={() => setShowAll(false)} css={css`font-size: 11px; display: block; margin-top: 4px;`}>
          Collapse
        </EuiLink>
      )}
    </div>
  );
}

export function NodeDetailFlyout({
  feature,
  queries,
  detections,
  significantEvents,
  nearbyEvents = [],
  connectedFeatures,
  correlatedNodeIds,
  sharedEventIds,
  sharedDetectionIds,
  onClose,
  onNavigateToNode,
  onEventClick,
}: NodeDetailFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const [filterShared, setFilterShared] = useState(false);

  const displayedEvents = filterShared && sharedEventIds
    ? significantEvents.filter((e) => sharedEventIds.has(e.event_id))
    : significantEvents;

  const displayedDetections = filterShared && sharedDetectionIds
    ? detections.filter((d) => sharedDetectionIds.has(d.rule_uuid))
    : detections;

  return (
    <div
      css={css`
        position: absolute;
        top: 16px;
        right: 16px;
        bottom: 16px;
        width: 380px;
        z-index: 20;
        background: ${euiTheme.colors.emptyShade};
        border: 1px solid ${euiTheme.colors.lightShade};
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `}
    >
      {/* Header */}
      <div
        css={css`
          padding: 20px 20px 16px;
          border-bottom: 1px solid ${euiTheme.colors.lightShade};
          flex-shrink: 0;
        `}
      >
        <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiText size="m" css={css`font-weight: 700;`}>
              {feature.title}
            </EuiText>
            <EuiText size="xs" color="subdued" css={css`margin-top: 4px;`}>
              {feature.description?.slice(0, 120)}
              {(feature.description?.length || 0) > 120 ? '…' : ''}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label="Close"
              onClick={onClose}
              display="empty"
              size="s"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">{feature.type}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{feature.subtype}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">{feature.confidence}%</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      {/* Scrollable content */}
      <div
        css={css`
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;

          &::-webkit-scrollbar {
            width: 6px;
          }
          &::-webkit-scrollbar-thumb {
            background: ${euiTheme.colors.mediumShade};
            border-radius: 3px;
          }
        `}
      >
        {/* Correlation hint with filter toggle */}
        {sharedEventIds && (
          <button
            onClick={() => setFilterShared(!filterShared)}
            css={css`
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              padding: 8px 12px;
              background: ${filterShared ? `${euiTheme.colors.accent}25` : `${euiTheme.colors.accent}10`};
              border: 1px solid ${filterShared ? euiTheme.colors.accent : `${euiTheme.colors.accent}40`};
              border-radius: 6px;
              margin-bottom: 12px;
              cursor: pointer;
              transition: all 0.15s ease;
              &:hover {
                background: ${euiTheme.colors.accent}20;
                border-color: ${euiTheme.colors.accent};
              }
            `}
          >
            <EuiIcon type="link" size="s" color="accent" />
            <EuiText size="xs" color="accent" css={css`flex: 1; text-align: left;`}>
              <strong>{sharedEventIds.size}</strong> shared significant event{sharedEventIds.size !== 1 ? 's' : ''}
            </EuiText>
            <EuiIcon type="filter" size="s" color={filterShared ? 'accent' : 'subdued'} />
          </button>
        )}

        {/* Significant Events — FIRST */}
        <SignificantEventsSection events={displayedEvents} onEventClick={onEventClick} sharedEventIds={sharedEventIds} />

        {/* Nearby sig events (2-hop) */}
        {nearbyEvents.length > 0 && !filterShared && (
          <NearbyEventsSection events={nearbyEvents} onEventClick={onEventClick} onNavigateToNode={onNavigateToNode} />
        )}

        <EuiSpacer size="l" />

        {/* Detections — SECOND */}
        <CollapsibleSection
          icon="visBarVertical"
          title="Detections"
          color={euiTheme.colors.warning}
          items={displayedDetections}
          emptyMessage="No change-point detections found."
          renderItem={(d, i) => <DetectionCard key={i} detection={d as FixtureDetection} isShared={sharedDetectionIds?.has((d as FixtureDetection).rule_uuid)} />}
        />

        <EuiSpacer size="l" />

        {/* Rules & Queries — THIRD */}
        <CollapsibleSection
          icon="editorCodeBlock"
          title="Rules & Queries"
          color={euiTheme.colors.primary}
          items={queries}
          emptyMessage="No rules or queries configured."
          renderItem={(q, i) => <QueryCard key={i} query={q as FixtureQuery} />}
        />

        <EuiSpacer size="l" />

        {/* Connected Nodes */}
        {connectedFeatures.length > 0 && (
          <>
            <SectionHeader
              icon="graphApp"
              title="Connected"
              count={connectedFeatures.length}
              color={euiTheme.colors.accent}
            />
            <EuiSpacer size="s" />
            <div css={css`display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;`}>
              {connectedFeatures.map((cf) => {
                const isCorrelated = correlatedNodeIds?.has(cf.id);
                return (
                <button
                  key={cf.id}
                  onClick={() => onNavigateToNode(cf.id)}
                  css={css`
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 10px;
                    background: ${isCorrelated ? `${euiTheme.colors.accent}15` : euiTheme.colors.lightestShade};
                    border: 1px solid ${isCorrelated ? euiTheme.colors.accent : euiTheme.colors.lightShade};
                    border-radius: 16px;
                    cursor: pointer;
                    transition: background 0.15s ease, border-color 0.15s ease;
                    &:hover {
                      background: ${euiTheme.colors.lightShade};
                      border-color: ${euiTheme.colors.primary};
                    }
                  `}
                >
                  <span
                    css={css`
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      background: ${euiTheme.colors.accent};
                      flex-shrink: 0;
                    `}
                  />
                  <span css={css`font-size: 11px; color: ${euiTheme.colors.text}; font-weight: 500;`}>
                    {cf.title.length > 20 ? cf.title.slice(0, 19) + '…' : cf.title}
                  </span>
                </button>
                );
              })}
            </div>
            <EuiSpacer size="l" />
          </>
        )}

        {/* Streams — LAST */}
        <SectionHeader
          icon="logstashInput"
          title="Underlying Streams"
          count={1}
          color={euiTheme.colors.subduedText}
        />
        <EuiSpacer size="s" />
        <div
          css={css`
            padding: 10px 12px;
            background: ${euiTheme.colors.lightestShade};
            border-radius: 6px;
            border: 1px solid ${euiTheme.colors.lightShade};
            font-family: ${euiTheme.font.familyCode};
            font-size: 12px;
            color: ${euiTheme.colors.text};
          `}
        >
          {feature.stream_name}
        </div>
      </div>
    </div>
  );
}
