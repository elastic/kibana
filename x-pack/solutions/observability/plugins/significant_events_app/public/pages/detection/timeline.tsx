/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  Detection,
  Feature,
  QueryWithOccurrences,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import type { DetectionEntity } from './model';
import type { useDetectionData } from './use_detection_data';
import { useEngineActivity } from './use_engine_activity';
import { useEngineSettings } from './use_engine_settings';
import { journey } from './journey_translations';
import { labels } from './translations';

type KnowledgeActivity = NonNullable<
  ReturnType<typeof useDetectionData>['data']
>['activity']['activities'][number];
type TimelineKind = 'knowledge' | 'rule' | 'matches' | 'detection' | 'event' | 'engine';
const activityLabel = (kind: KnowledgeActivity['kind']): string =>
  ({
    knowledge_added: labels.knowledgeAdded,
    knowledge_updated: labels.knowledgeUpdated,
    knowledge_removed: labels.knowledgeRemoved,
    rule_added: labels.ruleAdded,
    rule_updated: labels.ruleUpdated,
    rule_removed: labels.ruleRemoved,
  }[kind]);
interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  timestamp: number;
  title: string;
  entity: string;
  count?: number;
  activityKind?: KnowledgeActivity['kind'];
  detection?: Detection;
  feature?: Feature;
  query?: QueryWithOccurrences;
  event?: SignificantEventResponse;
}
interface TimelineLane {
  id: string;
  label: string;
  entries: TimelineEntry[];
  entity?: DetectionEntity;
  query?: QueryWithOccurrences;
}

const timestampLabel = (timestamp: number): string =>
  new Date(timestamp).toLocaleString(i18n.getLocale(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
const shortTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString(i18n.getLocale(), { hour: '2-digit', minute: '2-digit' });
const kindLabel = (kind: TimelineKind): string =>
  ({
    knowledge: labels.knowledge,
    rule: labels.ruleActivity,
    matches: labels.matches,
    detection: labels.ruleFired,
    event: labels.events,
    engine: journey.activity,
  }[kind]);

export const DetectionTimeline = ({
  entities,
  start,
  end,
  onInspectFeature,
  onInspectRule,
  onOpenEvent,
  onOpenDetection,
  activity,
  queries,
  features,
  detections,
  events,
  selectedStreams,
}: {
  activity: KnowledgeActivity[];
  queries: QueryWithOccurrences[];
  features: Feature[];
  detections: Detection[];
  events: SignificantEventResponse[];
  selectedStreams?: string[];
  entities: DetectionEntity[];
  start: number;
  end: number;
  onInspectFeature: (feature: Feature) => void;
  onInspectRule: (query: QueryWithOccurrences) => void;
  onOpenEvent: (event: SignificantEventResponse) => void;
  onOpenDetection: (detection: Detection) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const engine = useEngineActivity();
  const preferences = useEngineSettings();
  const controlsId = useGeneratedHtmlId({ prefix: 'detectionTimeline' });
  const [mode, setMode] = useState('lanes');
  const [showEventLabels, setShowEventLabels] = useState(false);
  const [feedLimit, setFeedLimit] = useState(60);
  const [fitActivity, setFitActivity] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<TimelineEntry[]>([]);
  const [visibleKinds, setVisibleKinds] = useState<Set<TimelineKind>>(
    new Set(['knowledge', 'rule', 'detection', 'event', 'engine'])
  );
  const colors = {
    knowledge: euiTheme.colors.accent,
    rule: euiTheme.colors.primary,
    matches: euiTheme.colors.textSubdued,
    detection: euiTheme.colors.warning,
    event: euiTheme.colors.danger,
    engine: euiTheme.colors.success,
  };

  const serviceLanes = useMemo<TimelineLane[]>(
    () =>
      entities.map((entity) => {
        const entries: TimelineEntry[] = [];
        for (const revision of activity.filter((item) =>
          entity.streams.includes(item.stream_name)
        )) {
          entries.push({
            id: `activity:${revision.id}`,
            kind: revision.kind.startsWith('knowledge') ? 'knowledge' : 'rule',
            activityKind: revision.kind,
            timestamp: Date.parse(revision.timestamp),
            title: revision.title,
            entity: entity.label,
            feature: features.find(
              (feature) =>
                feature.id === revision.indicator_id && feature.stream_name === revision.stream_name
            ),
            query: queries.find(
              (query) =>
                query.id === revision.indicator_id && query.stream_name === revision.stream_name
            ),
          });
        }
        for (const query of entity.queries)
          for (const bucket of query.occurrences) {
            if (bucket.count > 0)
              entries.push({
                id: `matches:${query.stream_name}:${query.id}:${bucket.date}`,
                kind: 'matches',
                timestamp: Date.parse(bucket.date),
                title: query.title,
                entity: entity.label,
                count: bucket.count,
                query,
              });
          }
        for (const detection of entity.detections)
          entries.push({
            id: `detection:${detection.detection_id}`,
            kind: 'detection',
            detection,
            timestamp: Date.parse(detection['@timestamp']),
            title: detection.rule_name || detection.change_point_type,
            entity: entity.label,
            query: entity.queries.find((query) => query.rule_uuid === detection.rule_uuid),
          });
        for (const event of entity.events)
          entries.push({
            id: `event:${event.event_id}`,
            kind: 'event',
            timestamp: Date.parse(event.created_at),
            title: event.title,
            entity: entity.label,
            event,
          });
        return {
          id: entity.id,
          label: entity.label,
          entity,
          entries: entries
            .filter(
              (entry) =>
                Number.isFinite(entry.timestamp) &&
                entry.timestamp >= start &&
                entry.timestamp <= end
            )
            .sort((a, b) => a.timestamp - b.timestamp),
        };
      }),
    [entities, start, end, activity, features, queries]
  );
  const assigned = new Set(serviceLanes.flatMap((lane) => lane.entries.map((entry) => entry.id)));
  const orphanEntries: TimelineEntry[] = [
    ...events.flatMap((event): TimelineEntry[] => [
      ...(event['@timestamp'] !== event.created_at
        ? [
            {
              id: `event-state:${event.event_uuid}`,
              kind: 'event' as const,
              timestamp: Date.parse(event['@timestamp']),
              title: `${
                event.status === 'dismissed'
                  ? labels.dismissed
                  : event.status === 'closed'
                  ? labels.closed
                  : labels.open
              } · ${event.title}`,
              entity: event.stream_names.join(' · '),
              event,
            },
          ]
        : []),
      ...(event.investigations ?? []).flatMap((run): TimelineEntry[] => [
        {
          id: `investigation:${run.workflow_execution_id}:started`,
          kind: 'event',
          timestamp: Date.parse(run.started_at),
          title: `${journey.investigations} · ${journey.inProgress} · ${event.title}`,
          entity: event.stream_names.join(' · '),
          event,
        },
        ...(run.completed_at
          ? [
              {
                id: `investigation:${run.workflow_execution_id}:finished`,
                kind: 'event' as const,
                timestamp: Date.parse(run.completed_at),
                title: `${journey.investigations} · ${journey.completed} · ${event.title}`,
                entity: event.stream_names.join(' · '),
                event,
              },
            ]
          : []),
      ]),
    ]),
    ...features
      .filter(
        (feature) =>
          feature.expires_at &&
          Date.parse(feature.expires_at) <= Date.now() &&
          (!selectedStreams || selectedStreams.includes(feature.stream_name))
      )
      .map(
        (feature): TimelineEntry => ({
          id: `expired:${feature.uuid}`,
          kind: 'knowledge',
          timestamp: Date.parse(feature.expires_at || ''),
          title: i18n.translate('xpack.significantEventsApp.timeline.expired', {
            defaultMessage: 'Knowledge expired · {title}',
            values: { title: feature.title || feature.id },
          }),
          entity: feature.stream_name,
          feature,
        })
      ),
    ...(engine.data?.runs ?? [])
      .filter((run) => !selectedStreams || (run.stream && selectedStreams.includes(run.stream)))
      .flatMap((run): TimelineEntry[] => {
        const stage = {
          pipeline: journey.startDiscovery,
          learning: journey.learning,
          evaluation: journey.evaluating,
          discovery: journey.discovery,
          review: journey.review,
        }[run.kind];
        return [
          {
            id: `engine:${run.id}:start`,
            kind: 'engine',
            timestamp: Date.parse(run.startedAt),
            title: `${stage} · ${journey.inProgress}`,
            entity: run.stream || labels.system,
          },
          ...(run.finishedAt
            ? [
                {
                  id: `engine:${run.id}:end`,
                  kind: 'engine' as const,
                  timestamp: Date.parse(run.finishedAt),
                  title: `${stage} · ${
                    run.error
                      ? journey.failed
                      : run.status === 'completed'
                      ? journey.completed
                      : run.status
                  }`,
                  entity: run.error || run.stream || labels.system,
                },
              ]
            : []),
        ];
      }),
    ...(!selectedStreams ? preferences.data?.history ?? [] : []).map(
      (item, index): TimelineEntry => ({
        id: `settings:${item.timestamp}:${index}`,
        kind: 'engine',
        timestamp: Date.parse(item.timestamp),
        title: item.message,
        entity: item.actor,
      })
    ),
    ...activity
      .filter(
        (item) =>
          (!selectedStreams || selectedStreams.includes(item.stream_name)) &&
          !assigned.has(`activity:${item.id}`)
      )
      .map(
        (item): TimelineEntry => ({
          id: `activity:${item.id}`,
          kind: item.kind.startsWith('knowledge') ? 'knowledge' : 'rule',
          activityKind: item.kind,
          timestamp: Date.parse(item.timestamp),
          title: item.title,
          entity: item.stream_name,
          feature: features.find(
            (feature) =>
              feature.id === item.indicator_id && feature.stream_name === item.stream_name
          ),
          query: queries.find(
            (query) => query.id === item.indicator_id && query.stream_name === item.stream_name
          ),
        })
      ),
    ...detections
      .filter((item) => !assigned.has(`detection:${item.detection_id}`))
      .map(
        (item): TimelineEntry => ({
          id: `detection:${item.detection_id}`,
          kind: 'detection',
          timestamp: Date.parse(item['@timestamp']),
          title: item.rule_name || item.change_point_type,
          entity: item.stream_name,
          detection: item,
          query: queries.find((query) => query.rule_uuid === item.rule_uuid),
        })
      ),
    ...events
      .filter((item) => !assigned.has(`event:${item.event_id}`))
      .map(
        (item): TimelineEntry => ({
          id: `event:${item.event_id}`,
          kind: 'event',
          timestamp: Date.parse(item.created_at),
          title: item.title,
          entity: item.stream_names.join(' · '),
          event: item,
        })
      ),
  ].filter(
    (item) => Number.isFinite(item.timestamp) && item.timestamp >= start && item.timestamp <= end
  );
  const lanes = orphanEntries.length
    ? [...serviceLanes, { id: 'unassignedActivity', label: labels.system, entries: orphanEntries }]
    : serviceLanes;
  const filteredLanes = lanes.map((lane) => ({
    ...lane,
    entries: lane.entries.filter((entry) => visibleKinds.has(entry.kind)),
  }));
  const allEntries = filteredLanes.flatMap((lane) => lane.entries);
  const feed = [...new Map(allEntries.map((entry) => [entry.id, entry])).values()].sort(
    (a, b) => b.timestamp - a.timestamp
  );
  const minTime = allEntries.length
    ? Math.min(...allEntries.map((entry) => entry.timestamp))
    : start;
  const maxTime = allEntries.length ? Math.max(...allEntries.map((entry) => entry.timestamp)) : end;
  const padding = Math.max(120_000, (maxTime - minTime) * 0.06);
  const from = fitActivity && allEntries.length ? Math.max(start, minTime - padding) : start;
  const to = fitActivity && allEntries.length ? Math.min(end, maxTime + padding) : end;
  const span = Math.max(1, to - from);
  const plotLeft = 194;
  const plotWidth = 800;
  const width = 1030;
  const ticks = Array.from({ length: 7 }, (_, index) => from + (span * index) / 6);
  const rows: TimelineLane[] = filteredLanes.flatMap((lane) => [
    lane,
    ...(expanded.has(lane.id)
      ? lane.entity?.queries.map((query) => ({
          id: `${lane.id}:${query.id}`,
          label: query.title,
          query,
          entries: lane.entries.filter((entry) => entry.query?.id === query.id),
        })) ?? []
      : []),
  ]);
  // Dense dots share a marker by kind; expanding reveals every entry at its actual timestamp.
  let nextLaneY = 40;
  const laneLayouts = rows.map((lane) => {
    const ordered = [...lane.entries].sort((a, b) => a.timestamp - b.timestamp);
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of ordered) {
      const x = plotLeft + ((entry.timestamp - from) / span) * plotWidth;
      const key = showEventLabels ? entry.id : `${entry.kind}:${Math.floor(x / 12)}`;
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }
    const trackEnds: number[] = [];
    const markers = [...groups.values()].map((entries) => {
      const entry = entries[0];
      const x = plotLeft + ((entry.timestamp - from) / span) * plotWidth;
      const labelWidth = 152;
      const labelX = x + labelWidth + 12 < width - 10 ? x + 10 : x - labelWidth - 10;
      const left = showEventLabels ? Math.min(x - 5, labelX) : x - 10;
      const right = showEventLabels ? Math.max(x + 5, labelX + labelWidth) : x + 10;
      let track = trackEnds.findIndex((value) => value + (showEventLabels ? 12 : 4) < left);
      if (track === -1) track = trackEnds.length;
      trackEnds[track] = right;
      return { entry, entries, x, labelX, track };
    });
    const laneHeight = Math.max(
      56,
      18 + Math.max(1, trackEnds.length) * (showEventLabels ? 40 : 20)
    );
    const y = nextLaneY;
    nextLaneY += laneHeight;
    return { lane, markers, y, height: laneHeight };
  });
  const height = nextLaneY + 12;
  const entryTooltip = (entry: TimelineEntry): React.ReactElement => (
    <EuiText size="xs">
      <p>
        <strong>{entry.title}</strong>
      </p>
      <p>
        {timestampLabel(entry.timestamp)} · {entry.entity}
      </p>
      <p>
        {entry.activityKind ? activityLabel(entry.activityKind) : kindLabel(entry.kind)}
        {entry.count ? ` · ${entry.count}` : ''}
      </p>
      {entry.event && (
        <>
          <p>
            {entry.event.status} · {entry.event.severity.replace(/^\d+-/, '')}
          </p>
          <p>{entry.event.summary}</p>
        </>
      )}
      {entry.feature && (
        <>
          <p>
            {entry.feature.confidence}% · {entry.feature.stream_name}
          </p>
          <p>{entry.feature.description}</p>
        </>
      )}
      {entry.query && <p>{entry.query.description || entry.query.stream_name}</p>}
      {entry.detection && (
        <p>
          {entry.detection.stream_name} · {entry.detection.change_point_type.replace(/_/g, ' ')}
        </p>
      )}
    </EuiText>
  );

  const action = (entry: TimelineEntry): void => {
    if (entry.feature) onInspectFeature(entry.feature);
    else if (entry.event) onOpenEvent(entry.event);
    else if (entry.detection) onOpenDetection(entry.detection);
    else if (entry.query) onInspectRule(entry.query);
  };
  const toggleExpanded = (id: string): void =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <EuiPanel
      paddingSize="none"
      hasBorder
      hasShadow={false}
      data-test-subj="detectionTimeline"
      css={css`
        overflow: hidden;
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.l};
          border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
        `}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" wrap>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{labels.browseTimeline}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {mode === 'lanes' && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                compressed
                label={i18n.translate('xpack.significantEventsApp.timeline.expandEvents', {
                  defaultMessage: 'Expand events',
                })}
                checked={showEventLabels}
                onChange={(event) => setShowEventLabels(event.target.checked)}
                data-test-subj="detectionTimelineExpandEvents"
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="significantEventsAppDetectionTimelineButton"
              size="xs"
              iconType="fullScreen"
              onClick={() => setFitActivity(!fitActivity)}
            >
              {fitActivity ? labels.fullRange : labels.fitActivity}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={labels.timelineView}
              buttonSize="compressed"
              idSelected={`${controlsId}-${mode}`}
              onChange={(id) => setMode(id === `${controlsId}-lanes` ? 'lanes' : 'feed')}
              options={[
                {
                  id: `${controlsId}-lanes`,
                  label: labels.serviceLanes,
                  iconType: 'visBarVertical',
                },
                { id: `${controlsId}-feed`, label: labels.activityFeed, iconType: 'list' },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: ${euiTheme.size.s};
            flex-wrap: wrap;
          `}
        >
          <div
            css={css`
              display: flex;
              gap: ${euiTheme.size.m};
              flex-wrap: wrap;
            `}
          >
            {(['knowledge', 'rule', 'detection', 'event', 'engine', 'matches'] as const).map(
              (kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={visibleKinds.has(kind)}
                  onClick={() =>
                    setVisibleKinds((previous) => {
                      const next = new Set(previous);
                      if (next.has(kind)) next.delete(kind);
                      else next.add(kind);
                      return next;
                    })
                  }
                  css={css`
                    opacity: ${visibleKinds.has(kind) ? 1 : 0.45};
                    font-size: ${euiTheme.font.scale.xs}rem;
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                    }
                  `}
                >
                  <EuiHealth color={colors[kind]}>{kindLabel(kind)}</EuiHealth>
                </button>
              )
            )}
          </div>
          <EuiText size="xs" color="subdued">
            <p>
              {shortTime(from)}–{shortTime(to)}
            </p>
          </EuiText>
        </div>
      </div>

      {mode === 'lanes' ? (
        <div
          css={css`
            overflow-x: auto;
            max-height: 660px;
            overflow-y: auto;
          `}
        >
          <div
            css={css`
              position: sticky;
              top: 0;
              z-index: 1;
              background: ${euiTheme.colors.backgroundBaseSubdued};
            `}
          >
            <svg
              viewBox={`0 0 ${width} 40`}
              aria-hidden={true}
              css={css`
                width: 100%;
                min-width: 760px;
                height: auto;
                overflow: hidden;
                display: block;
                font-family: ${euiTheme.font.family};
              `}
            >
              <rect width={width} height="40" fill={euiTheme.colors.backgroundBaseSubdued} />
              <text x="18" y="25" fontSize="11" fill={euiTheme.colors.textSubdued}>
                {labels.services}
              </text>
              {ticks.map((tick, index) => (
                <g key={index}>
                  <line
                    x1={plotLeft + (index * plotWidth) / 6}
                    y1="40"
                    x2={plotLeft + (index * plotWidth) / 6}
                    y2={height}
                    stroke={euiTheme.colors.borderBasePlain}
                    strokeDasharray="2 5"
                  />
                  <text
                    x={plotLeft + (index * plotWidth) / 6}
                    y="25"
                    textAnchor={index === 0 ? 'start' : index === 6 ? 'end' : 'middle'}
                    fontSize="10"
                    fill={euiTheme.colors.textSubdued}
                  >
                    {shortTime(tick)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <svg
            viewBox={`0 40 ${width} ${height - 40}`}
            role="group"
            aria-label={labels.timelineLabel}
            css={css`
              width: 100%;
              min-width: 760px;
              height: auto;
              overflow: hidden;
              display: block;
              font-family: ${euiTheme.font.family};
            `}
          >
            <rect width={width} height="40" fill={euiTheme.colors.backgroundBaseSubdued} />
            <text x="18" y="25" fontSize="11" fill={euiTheme.colors.textSubdued}>
              {labels.services}
            </text>
            {ticks.map((tick, index) => (
              <g key={index}>
                <line
                  x1={plotLeft + (index * plotWidth) / 6}
                  y1="40"
                  x2={plotLeft + (index * plotWidth) / 6}
                  y2={height}
                  stroke={euiTheme.colors.borderBasePlain}
                  strokeDasharray="2 5"
                />
                <text
                  x={plotLeft + (index * plotWidth) / 6}
                  y="25"
                  textAnchor={index === 0 ? 'start' : index === 6 ? 'end' : 'middle'}
                  fontSize="10"
                  fill={euiTheme.colors.textSubdued}
                >
                  {shortTime(tick)}
                </text>
              </g>
            ))}
            {laneLayouts.map(({ lane, markers, y, height: laneHeight }, index) => (
              <g key={lane.id}>
                <rect
                  x="0"
                  y={y}
                  width={width}
                  height={laneHeight}
                  fill={
                    index % 2 === 0
                      ? euiTheme.colors.backgroundBasePlain
                      : euiTheme.colors.backgroundBaseSubdued
                  }
                />
                <line
                  x1="0"
                  y1={y + laneHeight}
                  x2={width}
                  y2={y + laneHeight}
                  stroke={euiTheme.colors.borderBasePlain}
                />
                <line
                  x1={plotLeft}
                  y1={y + 26}
                  x2={plotLeft + plotWidth}
                  y2={y + 26}
                  stroke={euiTheme.colors.borderBasePlain}
                />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={lane.label}
                  aria-expanded={lane.entity ? expanded.has(lane.id) : undefined}
                  onClick={() => (lane.query ? onInspectRule(lane.query) : toggleExpanded(lane.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (lane.query) onInspectRule(lane.query);
                      else toggleExpanded(lane.id);
                    }
                  }}
                  css={css`
                    cursor: pointer;
                    &:focus-visible {
                      outline: 2px solid ${euiTheme.colors.primary};
                    }
                  `}
                >
                  <title>{lane.label}</title>
                  <text
                    x={lane.query ? 34 : 18}
                    y={y + 27}
                    fontSize={lane.query ? '10' : '11'}
                    fontWeight={lane.query ? '400' : '600'}
                    fill={euiTheme.colors.text}
                  >
                    {lane.label.length > 23 ? `${lane.label.slice(0, 21)}…` : lane.label}
                  </text>
                  <text
                    x={lane.query ? 34 : 18}
                    y={y + 43}
                    fontSize="9"
                    fill={euiTheme.colors.textSubdued}
                  >
                    {i18n.translate('xpack.significantEventsApp.timeline.laneEntryCount', {
                      defaultMessage: '{count, plural, one {# activity} other {# activities}}',
                      values: { count: lane.entries.length },
                    })}
                  </text>
                  {lane.entity && (
                    <text x="174" y={y + 27} fontSize="12" fill={euiTheme.colors.textSubdued}>
                      {expanded.has(lane.id) ? '−' : '+'}
                    </text>
                  )}
                </g>
                {markers.map(({ entry, entries, x, labelX, track }) => {
                  const markerY = y + 26 + track * (showEventLabels ? 40 : 20);
                  const color = colors[entry.kind];
                  return (
                    <g key={entry.id}>
                      {showEventLabels ? (
                        <>
                          <line
                            x1={x}
                            y1={y + 12}
                            x2={x}
                            y2={markerY}
                            stroke={color}
                            strokeOpacity=".25"
                            strokeDasharray="2 3"
                          />
                          <line
                            x1={x}
                            y1={markerY}
                            x2={labelX < x ? labelX + 152 : labelX}
                            y2={markerY}
                            stroke={color}
                            strokeOpacity=".5"
                          />
                          {entry.kind === 'knowledge' ? (
                            <path
                              d={`M ${x} ${markerY - 4} L ${x + 4} ${markerY} L ${x} ${
                                markerY + 4
                              } L ${x - 4} ${markerY} Z`}
                              fill={color}
                            />
                          ) : entry.kind === 'detection' ? (
                            <rect
                              x={x - 4}
                              y={markerY - 4}
                              width="8"
                              height="8"
                              rx="2"
                              fill={color}
                            />
                          ) : (
                            <circle
                              cx={x}
                              cy={markerY}
                              r={entry.kind === 'event' ? 5 : 3}
                              fill={color}
                            />
                          )}
                        </>
                      ) : (
                        <foreignObject x={x - 10} y={markerY - 10} width="20" height="20">
                          <EuiToolTip
                            position="top"
                            delay="regular"
                            content={
                              entries.length === 1 ? (
                                entryTooltip(entry)
                              ) : (
                                <EuiText size="xs">
                                  <p>
                                    <strong>
                                      {i18n.translate(
                                        'xpack.significantEventsApp.timeline.groupedEntries',
                                        {
                                          defaultMessage: '{count} activities · {kind}',
                                          values: {
                                            count: entries.length,
                                            kind: kindLabel(entry.kind),
                                          },
                                        }
                                      )}
                                    </strong>
                                  </p>
                                  <p>{lane.label}</p>
                                  <p>
                                    {timestampLabel(entry.timestamp)}–
                                    {timestampLabel(entries[entries.length - 1].timestamp)}
                                  </p>
                                  {entries.slice(0, 5).map((item) => (
                                    <p key={item.id}>{item.title}</p>
                                  ))}
                                  {entries.length > 5 && (
                                    <p>
                                      {i18n.translate(
                                        'xpack.significantEventsApp.timeline.moreEntries',
                                        {
                                          defaultMessage: '+{count} more · Select to see all',
                                          values: { count: entries.length - 5 },
                                        }
                                      )}
                                    </p>
                                  )}
                                </EuiText>
                              )
                            }
                          >
                            <button
                              type="button"
                              onClick={() => setSelected(entries)}
                              aria-label={
                                entries.length === 1
                                  ? `${entry.title}, ${timestampLabel(entry.timestamp)}, ${
                                      lane.label
                                    }`
                                  : i18n.translate(
                                      'xpack.significantEventsApp.timeline.groupedEntryLabel',
                                      {
                                        defaultMessage:
                                          '{count} {kind} activities for {service}. Select to expand details.',
                                        values: {
                                          count: entries.length,
                                          kind: kindLabel(entry.kind),
                                          service: lane.label,
                                        },
                                      }
                                    )
                              }
                              data-test-subj="detectionTimelineDotEntry"
                              css={css`
                                display: grid;
                                place-items: center;
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                color: ${euiTheme.colors.text};
                                &:hover {
                                  background: color-mix(in srgb, ${color} 18%, transparent);
                                }
                                &:focus-visible {
                                  outline: 2px solid ${euiTheme.colors.primary};
                                  outline-offset: -2px;
                                }
                              `}
                            >
                              <span
                                css={css`
                                  display: grid;
                                  place-items: center;
                                  width: ${entries.length > 1
                                    ? 18
                                    : entry.kind === 'event'
                                    ? 10
                                    : 7}px;
                                  height: ${entries.length > 1
                                    ? 18
                                    : entry.kind === 'event'
                                    ? 10
                                    : 7}px;
                                  border-radius: 50%;
                                  background: ${color};
                                  color: ${euiTheme.colors.backgroundBasePlain};
                                  font-size: 8px;
                                  font-weight: ${euiTheme.font.weight.semiBold};
                                  font-variant-numeric: tabular-nums;
                                `}
                              >
                                {entries.length > 1 ? entries.length : null}
                              </span>
                            </button>
                          </EuiToolTip>
                        </foreignObject>
                      )}
                      {showEventLabels && (
                        <foreignObject x={labelX} y={markerY - 17} width="152" height="36">
                          <EuiToolTip content={entryTooltip(entry)} position="top" delay="regular">
                            <button
                              type="button"
                              onClick={() => setSelected([entry])}
                              aria-label={`${entry.title}, ${timestampLabel(entry.timestamp)}, ${
                                lane.label
                              }`}
                              data-test-subj="detectionTimelineLabeledEntry"
                              css={css`
                                width: 152px;
                                height: 34px;
                                padding: 3px 6px;
                                text-align: left;
                                color: ${euiTheme.colors.text};
                                border-left: 2px solid ${color};
                                border-radius: ${euiTheme.border.radius.medium};
                                background: color-mix(
                                  in srgb,
                                  ${color} 8%,
                                  ${euiTheme.colors.backgroundBasePlain}
                                );
                                &:hover {
                                  background: color-mix(
                                    in srgb,
                                    ${color} 16%,
                                    ${euiTheme.colors.backgroundBasePlain}
                                  );
                                }
                                &:focus-visible {
                                  outline: 2px solid ${euiTheme.colors.primary};
                                  outline-offset: -2px;
                                }
                              `}
                            >
                              <span
                                css={css`
                                  display: block;
                                  overflow: hidden;
                                  text-overflow: ellipsis;
                                  white-space: nowrap;
                                  font-size: 8px;
                                  line-height: 11px;
                                  color: ${color};
                                `}
                              >
                                {entry.activityKind
                                  ? activityLabel(entry.activityKind)
                                  : kindLabel(entry.kind)}
                                {entry.count ? ` · ${entry.count}` : ''}
                              </span>
                              <span
                                css={css`
                                  display: block;
                                  overflow: hidden;
                                  text-overflow: ellipsis;
                                  white-space: nowrap;
                                  font-size: 10px;
                                  line-height: 14px;
                                  font-weight: ${euiTheme.font.weight.medium};
                                `}
                              >
                                {entry.title}
                              </span>
                            </button>
                          </EuiToolTip>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div
          css={css`
            padding: ${euiTheme.size.m} ${euiTheme.size.l};
            max-height: 600px;
            overflow-y: auto;
          `}
        >
          {feed.slice(0, feedLimit).map((entry) => (
            <EuiToolTip key={entry.id} content={entryTooltip(entry)} position="top">
              <button
                type="button"
                key={entry.id}
                onClick={() => setSelected([entry])}
                css={css`
                  display: grid;
                  grid-template-columns: 130px 24px minmax(0, 1fr);
                  gap: ${euiTheme.size.s};
                  width: 100%;
                  text-align: left;
                  color: ${euiTheme.colors.text};
                  padding: ${euiTheme.size.s} 0;
                  border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
                  &:focus-visible {
                    outline: 2px solid ${euiTheme.colors.primary};
                  }
                  &:hover {
                    background: ${euiTheme.colors.backgroundBaseSubdued};
                  }
                `}
              >
                <span
                  css={css`
                    font-size: ${euiTheme.font.scale.xs}rem;
                    color: ${euiTheme.colors.textSubdued};
                  `}
                >
                  {timestampLabel(entry.timestamp)}
                </span>
                <span
                  css={css`
                    border-left: 1px solid ${euiTheme.colors.borderBasePlain};
                    display: grid;
                    place-items: center;
                  `}
                >
                  <EuiIcon
                    type={
                      entry.kind === 'knowledge'
                        ? 'documents'
                        : entry.kind === 'event'
                        ? 'bell'
                        : entry.kind === 'rule'
                        ? 'gear'
                        : 'visLine'
                    }
                    color={colors[entry.kind]}
                    aria-hidden={true}
                  />
                </span>
                <span>
                  <span
                    css={css`
                      display: block;
                      font-size: ${euiTheme.font.scale.xs}rem;
                      color: ${euiTheme.colors.textSubdued};
                    `}
                  >
                    {entry.entity} ·{' '}
                    {entry.activityKind ? activityLabel(entry.activityKind) : kindLabel(entry.kind)}
                    {entry.count ? ` · ${entry.count}` : ''}
                  </span>
                  <span
                    css={css`
                      font-size: ${euiTheme.font.scale.s}rem;
                    `}
                  >
                    {entry.title}
                  </span>
                </span>
              </button>
            </EuiToolTip>
          ))}
          {feed.length > feedLimit && (
            <EuiButtonEmpty
              data-test-subj="significantEventsAppDetectionTimelineButton"
              size="s"
              onClick={() => setFeedLimit(feedLimit + 60)}
            >
              {labels.showMore}
            </EuiButtonEmpty>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div
          css={css`
            padding: ${euiTheme.size.m} ${euiTheme.size.l};
            border-top: 1px solid ${euiTheme.colors.borderBasePlain};
            background: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiText size="xs">
                <p>
                  {timestampLabel(selected[0].timestamp)} · {kindLabel(selected[0].kind)} ·{' '}
                  {selected[0].entity}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="significantEventsAppDetectionTimelineButton"
                size="xs"
                iconType="cross"
                onClick={() => setSelected([])}
              >
                {labels.closeDetails}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <div
            css={css`
              max-height: 240px;
              overflow-y: auto;
            `}
          >
            {selected.map((entry) => (
              <EuiButtonEmpty
                data-test-subj="significantEventsAppDetectionTimelineButton"
                key={entry.id}
                size="xs"
                flush="left"
                iconType="sortRight"
                onClick={() => action(entry)}
                isDisabled={!entry.feature && !entry.query && !entry.event && !entry.detection}
              >
                {entry.title}
                {entry.count ? ` · ${entry.count} ${labels.matches}` : ''}
              </EuiButtonEmpty>
            ))}
          </div>
        </div>
      )}
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.l};
          border-top: 1px solid ${euiTheme.colors.borderBasePlain};
        `}
      >
        <EuiText size="xs" color="subdued">
          <p>{feed.length === 0 ? labels.noTimelineActivity : labels.timelineHistory}</p>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
