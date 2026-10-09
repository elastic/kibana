/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  buildTimelineConnections,
  type KnowledgeActivity,
  type TimelineEntry,
  type TimelineKind,
} from './timeline_connections';
import { useEngineActivity } from './use_engine_activity';
import { useEngineSettings } from './use_engine_settings';
import { journey } from './journey_translations';
import { labels } from './translations';
import { useViewportSpace } from './use_viewport_space';
import { WorkspaceDrawer } from './workspace_drawer';

const activityLabel = (kind: KnowledgeActivity['kind']): string =>
  ({
    knowledge_added: labels.knowledgeAdded,
    knowledge_updated: labels.knowledgeUpdated,
    knowledge_removed: labels.knowledgeRemoved,
    rule_added: labels.ruleAdded,
    rule_updated: labels.ruleUpdated,
    rule_removed: labels.ruleRemoved,
  }[kind]);
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
  const viewport = useViewportSpace<HTMLDivElement>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1030, height: 600 });
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });
  const [activityDetail, setActivityDetail] = useState<TimelineEntry>();
  const engine = useEngineActivity();
  const preferences = useEngineSettings();
  const controlsId = useGeneratedHtmlId({ prefix: 'detectionTimeline' });
  const [mode, setMode] = useState('lanes');
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = (): void =>
      setCanvasSize({ width: canvas.clientWidth, height: canvas.clientHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    measure();
    setScrollPosition({ top: 0, left: 0 });
    return () => observer.disconnect();
  }, [mode]);
  const [showEventLabels, setShowEventLabels] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const connectionMarkerId = useGeneratedHtmlId({ prefix: 'timelineConnectionArrow' });
  const scopeKey = JSON.stringify([entities.map((entity) => entity.id), selectedStreams]);
  const [feedLimit, setFeedLimit] = useState(60);
  const [fitActivity, setFitActivity] = useState(false);
  useEffect(() => {
    setFitActivity(false);
  }, [start, end]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<TimelineEntry[]>([]);
  useEffect(() => {
    setSelected([]);
    setFeedLimit(60);
  }, [scopeKey]);
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
            stream: revision.stream_name,
            indicatorId: revision.indicator_id,
            timestamp: Date.parse(revision.timestamp),
            title: revision.title,
            entity: entity.label,
            feature: features.find(
              (feature) =>
                (feature.id === revision.indicator_id || feature.uuid === revision.indicator_id) &&
                feature.stream_name === revision.stream_name
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
              relatedEntryId: `event:${event.event_id}`,
              kind: 'event' as const,
              timestamp: Date.parse(event['@timestamp']),
              title: `${
                event.status === 'active'
                  ? i18n.translate('xpack.significantEventsApp.timeline.active', {
                      defaultMessage: 'Active',
                    })
                  : i18n.translate('xpack.significantEventsApp.timeline.inactive', {
                      defaultMessage: 'Inactive',
                    })
              } · ${event.title}`,
              entity: event.stream_names.join(' · '),
              event,
            },
          ]
        : []),
      ...(event.investigations ?? []).flatMap((run): TimelineEntry[] => [
        {
          id: `investigation:${run.workflow_execution_id}:started`,
          relatedEntryId: `event:${event.event_id}`,
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
                relatedEntryId: `investigation:${run.workflow_execution_id}:started`,
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
                  relatedEntryId: `engine:${run.id}:start`,
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
          stream: item.stream_name,
          indicatorId: item.indicator_id,
          timestamp: Date.parse(item.timestamp),
          title: item.title,
          entity: item.stream_name,
          feature: features.find(
            (feature) =>
              (feature.id === item.indicator_id || feature.uuid === item.indicator_id) &&
              feature.stream_name === item.stream_name
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
  const overviewEntries = [
    ...new Map(
      [...serviceLanes.flatMap((lane) => lane.entries), ...orphanEntries].map((entry) => [
        entry.id,
        entry,
      ])
    ).values(),
  ];
  const lanes: TimelineLane[] = [
    { id: 'timelineOverview', label: labels.overview, entries: overviewEntries },
    ...serviceLanes,
  ];
  const filteredLanes = lanes.map((lane) => ({
    ...lane,
    entries: lane.entries.filter((entry) => visibleKinds.has(entry.kind)),
  }));
  const allEntries = [
    ...new Map(
      filteredLanes.flatMap((lane) => lane.entries).map((entry) => [entry.id, entry])
    ).values(),
  ];
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
  const width = Math.max(480, canvasSize.width);
  const plotWidth = width - plotLeft - 36;
  const tickCount = Math.max(3, Math.min(7, Math.floor(plotWidth / 125) + 1));
  const ticks = Array.from(
    { length: tickCount },
    (_, index) => from + (span * index) / (tickCount - 1)
  );
  const tickLabel = (timestamp: number): string =>
    span >= 24 * 60 * 60 * 1000
      ? new Date(timestamp).toLocaleString(i18n.getLocale(), {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : shortTime(timestamp);
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
    const expandedLabels = showEventLabels && lane.id !== 'timelineOverview';
    const ordered = [...lane.entries].sort((a, b) => a.timestamp - b.timestamp);
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of ordered) {
      const x = plotLeft + ((entry.timestamp - from) / span) * plotWidth;
      const key = expandedLabels ? entry.id : `${entry.kind}:${Math.floor(x / 12)}`;
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
      const left = expandedLabels ? Math.min(x - 5, labelX) : x - 10;
      const right = expandedLabels ? Math.max(x + 5, labelX + labelWidth) : x + 10;
      let track = trackEnds.findIndex((value) => value + (expandedLabels ? 12 : 4) < left);
      if (track === -1) track = trackEnds.length;
      trackEnds[track] = right;
      return { entry, entries, x, labelX, track };
    });
    const laneHeight = Math.max(
      56,
      18 + Math.max(1, trackEnds.length) * (expandedLabels ? 40 : 20)
    );
    const y = nextLaneY;
    nextLaneY += laneHeight;
    return { lane, markers, y, height: laneHeight };
  });
  const height = nextLaneY + 12;
  const connections = buildTimelineConnections(allEntries);
  const entriesById = new Map(allEntries.map((entry) => [entry.id, entry]));
  const positions = new Map<string, { x: number; y: number; pinned: boolean }>();
  const overviewBottom = (laneLayouts[0]?.y ?? 40) + (laneLayouts[0]?.height ?? 56);
  for (const { lane, markers, y } of [...laneLayouts.slice(1), ...laneLayouts.slice(0, 1)]) {
    if (lane.query) continue;
    for (const marker of markers) {
      for (const entry of marker.entries) {
        if (!positions.has(entry.id))
          positions.set(entry.id, {
            x: marker.x,
            pinned: lane.id === 'timelineOverview',
            y:
              y + 26 + marker.track * (showEventLabels && lane.id !== 'timelineOverview' ? 40 : 20),
          });
      }
    }
  }
  const selectedIds = new Set(selected.map((entry) => entry.id));
  const relatedConnections = connections.filter(
    (connection) => selectedIds.has(connection.source) || selectedIds.has(connection.target)
  );
  const relatedIds = new Set(
    relatedConnections.flatMap((connection) => [connection.source, connection.target])
  );
  const connectionGroups = new Map<
    string,
    {
      source: { x: number; y: number };
      target: { x: number; y: number };
      links: typeof connections;
    }
  >();
  for (const connection of connections) {
    const screenPosition = (id: string): { x: number; y: number } | undefined => {
      const position = positions.get(id);
      if (!position) return;
      const y = position.pinned ? position.y : position.y - scrollPosition.top;
      if ((!position.pinned && y < overviewBottom) || y > canvasSize.height) return;
      return { x: position.x - scrollPosition.left, y };
    };
    const source = screenPosition(connection.source);
    const target = screenPosition(connection.target);
    if (!source || !target || (source.x === target.x && source.y === target.y)) continue;
    const key = JSON.stringify([source, target]);
    const group = connectionGroups.get(key) ?? { source, target, links: [] };
    group.links.push(connection);
    connectionGroups.set(key, group);
  }
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
      {connections
        .filter((connection) => connection.source === entry.id || connection.target === entry.id)
        .map((connection) => {
          const other = entriesById.get(
            connection.source === entry.id ? connection.target : connection.source
          );
          return (
            <p key={`${connection.source}:${connection.target}`}>
              {connection.label} · {other?.title}
            </p>
          );
        })}
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
    else setActivityDetail(entry);
  };
  const toggleExpanded = (id: string): void =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderLanes = (layouts: typeof laneLayouts): React.ReactNode =>
    layouts.map(({ lane, markers, y, height: laneHeight }) => {
      const expandedLabels = showEventLabels && lane.id !== 'timelineOverview';
      return (
        <g key={lane.id}>
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
            onClick={() =>
              lane.id === 'timelineOverview'
                ? setSelected(lane.entries)
                : lane.query
                ? onInspectRule(lane.query)
                : toggleExpanded(lane.id)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (lane.id === 'timelineOverview') setSelected(lane.entries);
                else if (lane.query) onInspectRule(lane.query);
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
            const markerY = y + 26 + track * (expandedLabels ? 40 : 20);
            const color = colors[entry.kind];
            return (
              <g
                key={entry.id}
                opacity={
                  selected.length &&
                  showConnections &&
                  !entries.some((item) => selectedIds.has(item.id) || relatedIds.has(item.id))
                    ? 0.35
                    : 1
                }
              >
                {expandedLabels ? (
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
                        d={`M ${x} ${markerY - 4} L ${x + 4} ${markerY} L ${x} ${markerY + 4} L ${
                          x - 4
                        } ${markerY} Z`}
                        fill={color}
                      />
                    ) : entry.kind === 'detection' ? (
                      <rect x={x - 4} y={markerY - 4} width="8" height="8" rx="2" fill={color} />
                    ) : (
                      <circle cx={x} cy={markerY} r={entry.kind === 'event' ? 5 : 3} fill={color} />
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
                                {i18n.translate('xpack.significantEventsApp.timeline.moreEntries', {
                                  defaultMessage: '+{count} more · Select to see all',
                                  values: { count: entries.length - 5 },
                                })}
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
                            ? `${entry.title}, ${timestampLabel(entry.timestamp)}, ${lane.label}`
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
                            width: ${entries.length > 1 ? 18 : entry.kind === 'event' ? 10 : 7}px;
                            height: ${entries.length > 1 ? 18 : entry.kind === 'event' ? 10 : 7}px;
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
                {expandedLabels && (
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
      );
    });

  return (
    <div ref={viewport.ref} style={{ height: viewport.height }}>
      <EuiPanel
        paddingSize="none"
        hasBorder
        hasShadow={false}
        data-test-subj="detectionTimeline"
        css={css`
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
          min-height: 0;
        `}
      >
        <div
          css={css`
            flex-shrink: 0;
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
                  label={i18n.translate('xpack.significantEventsApp.timeline.showConnections', {
                    defaultMessage: 'Connections',
                  })}
                  checked={showConnections}
                  onChange={(event) => setShowConnections(event.target.checked)}
                  data-test-subj="detectionTimelineConnections"
                />
              </EuiFlexItem>
            )}
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
                {tickLabel(from)}–{tickLabel(to)}
              </p>
            </EuiText>
          </div>
        </div>

        {mode === 'lanes' ? (
          <div
            ref={canvasRef}
            data-test-subj="detectionTimelineCanvas"
            css={css`
              position: relative;
              flex: 1 1 auto;
              min-height: 0;
              overflow: hidden;
            `}
          >
            <div
              onScroll={(event) =>
                setScrollPosition({
                  top: event.currentTarget.scrollTop,
                  left: event.currentTarget.scrollLeft,
                })
              }
              css={css`
                overflow: auto;
                height: 100%;
                overscroll-behavior: contain;
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
                  viewBox={`0 0 ${width} ${overviewBottom}`}
                  role="group"
                  aria-label={labels.overview}
                  css={css`
                    width: 100%;
                    min-width: 480px;
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
                        x1={plotLeft + (index * plotWidth) / (ticks.length - 1)}
                        y1="40"
                        x2={plotLeft + (index * plotWidth) / (ticks.length - 1)}
                        y2={height}
                        stroke={euiTheme.colors.borderBasePlain}
                        strokeDasharray="2 5"
                      />
                      <text
                        x={plotLeft + (index * plotWidth) / (ticks.length - 1)}
                        y="25"
                        textAnchor={
                          index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle'
                        }
                        fontSize="10"
                        fill={euiTheme.colors.textSubdued}
                      >
                        {tickLabel(tick)}
                      </text>
                    </g>
                  ))}
                  {renderLanes(laneLayouts.slice(0, 1))}
                </svg>
              </div>
              <svg
                viewBox={`0 ${overviewBottom} ${width} ${Math.max(1, height - overviewBottom)}`}
                role="group"
                aria-label={labels.timelineLabel}
                css={css`
                  width: 100%;
                  min-width: 480px;
                  height: auto;
                  overflow: hidden;
                  display: block;
                  font-family: ${euiTheme.font.family};
                `}
              >
                {laneLayouts.map(({ lane, y, height: laneHeight }, index) => (
                  <rect
                    key={lane.id}
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
                ))}
                <rect width={width} height="40" fill={euiTheme.colors.backgroundBaseSubdued} />
                <text x="18" y="25" fontSize="11" fill={euiTheme.colors.textSubdued}>
                  {labels.services}
                </text>
                {ticks.map((tick, index) => (
                  <g key={index}>
                    <line
                      x1={plotLeft + (index * plotWidth) / (ticks.length - 1)}
                      y1="40"
                      x2={plotLeft + (index * plotWidth) / (ticks.length - 1)}
                      y2={height}
                      stroke={euiTheme.colors.borderBasePlain}
                      strokeDasharray="2 5"
                    />
                    <text
                      x={plotLeft + (index * plotWidth) / (ticks.length - 1)}
                      y="25"
                      textAnchor={
                        index === 0 ? 'start' : index === ticks.length - 1 ? 'end' : 'middle'
                      }
                      fontSize="10"
                      fill={euiTheme.colors.textSubdued}
                    >
                      {tickLabel(tick)}
                    </text>
                  </g>
                ))}
                {renderLanes(laneLayouts.slice(1))}
              </svg>
            </div>
            {showConnections && (
              <svg
                viewBox={`0 0 ${width} ${Math.max(1, canvasSize.height)}`}
                aria-label={i18n.translate('xpack.significantEventsApp.timeline.connectionLayer', {
                  defaultMessage: 'Activity connections',
                })}
                css={css`
                  position: absolute;
                  inset: 0;
                  width: 100%;
                  height: 100%;
                  z-index: 2;
                  pointer-events: none;
                  overflow: hidden;
                `}
                data-test-subj="detectionTimelineConnectionLayer"
              >
                <defs>
                  <marker
                    id={connectionMarkerId}
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={euiTheme.colors.primary} />
                  </marker>
                </defs>{' '}
                {showConnections &&
                  [...connectionGroups.entries()].map(([key, { source, target, links }]) => {
                    const highlighted = links.some(
                      (link) => selectedIds.has(link.source) || selectedIds.has(link.target)
                    );
                    const bend = Math.max(30, Math.abs(target.x - source.x) / 2);
                    const direction = target.x >= source.x ? 1 : -1;
                    const path =
                      source.y === target.y
                        ? `M ${source.x} ${source.y} C ${source.x} ${source.y - 18}, ${target.x} ${
                            target.y - 32
                          }, ${target.x} ${target.y}`
                        : `M ${source.x} ${source.y} C ${source.x + direction * bend} ${
                            source.y
                          }, ${target.x - direction * bend} ${target.y}, ${target.x} ${target.y}`;
                    const description = links
                      .map(
                        (link) =>
                          `${link.label}: ${entriesById.get(link.source)?.title} → ${
                            entriesById.get(link.target)?.title
                          }`
                      )
                      .join(' · ');
                    const selectConnection = (): void =>
                      setSelected(
                        [...new Set(links.flatMap((link) => [link.source, link.target]))].flatMap(
                          (id) => {
                            const entry = entriesById.get(id);
                            return entry ? [entry] : [];
                          }
                        )
                      );
                    return (
                      <g
                        key={key}
                        role="button"
                        tabIndex={0}
                        aria-label={description}
                        onClick={selectConnection}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectConnection();
                          }
                        }}
                        data-test-subj="detectionTimelineConnection"
                        css={css`
                          cursor: pointer;
                          &:focus-visible {
                            outline: 2px solid ${euiTheme.colors.primary};
                          }
                        `}
                      >
                        <title>{description}</title>
                        <path
                          d={path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="8"
                          pointerEvents="stroke"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke={euiTheme.colors.primary}
                          strokeWidth={highlighted ? 2 : 1.25}
                          opacity={selected.length && !highlighted ? 0.1 : highlighted ? 0.9 : 0.35}
                          markerEnd={`url(#${connectionMarkerId})`}
                          pointerEvents="none"
                        />
                      </g>
                    );
                  })}
              </svg>
            )}
          </div>
        ) : (
          <div
            css={css`
              padding: ${euiTheme.size.m} ${euiTheme.size.l};
              flex: 1 1 auto;
              min-height: 0;
              overflow-y: auto;
            `}
          >
            <ul
              css={css`
                display: flex;
                flex-direction: column;
                margin: 0;
                padding: 0;
                list-style: none;
              `}
            >
              {feed.slice(0, feedLimit).map((entry) => (
                <li
                  key={entry.id}
                  css={css`
                    display: block;
                    width: 100%;
                    border-bottom: 1px solid ${euiTheme.colors.borderBasePlain};
                  `}
                >
                  <EuiToolTip content={entryTooltip(entry)} position="top" display="block">
                    <button
                      type="button"
                      onClick={() => action(entry)}
                      data-test-subj="detectionTimelineFeedEntry"
                      css={css`
                        display: grid;
                        grid-template-columns: 130px 24px minmax(0, 1fr);
                        gap: ${euiTheme.size.s};
                        width: 100%;
                        text-align: left;
                        color: ${euiTheme.colors.text};
                        padding: ${euiTheme.size.s} 0;
                        align-items: center;
                        @media (max-width: 700px) {
                          grid-template-columns: 85px 20px minmax(0, 1fr);
                        }
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
                          {entry.activityKind
                            ? activityLabel(entry.activityKind)
                            : kindLabel(entry.kind)}
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
                </li>
              ))}
            </ul>
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

        {mode === 'lanes' && selected.length > 0 && (
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
            {relatedConnections.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="xs">
                  <strong>
                    {i18n.translate('xpack.significantEventsApp.timeline.relatedActivity', {
                      defaultMessage: 'Connected activity',
                    })}
                  </strong>
                </EuiText>
                <ul
                  css={css`
                    list-style: none;
                    margin: 0;
                    padding: 0;
                  `}
                >
                  {relatedConnections.map((connection) => {
                    const source = entriesById.get(connection.source);
                    const target = entriesById.get(connection.target);
                    if (!source || !target) return null;
                    return (
                      <li key={`${connection.source}:${connection.target}`}>
                        <EuiButtonEmpty
                          size="xs"
                          flush="left"
                          iconType="link"
                          onClick={() => setSelected([source, target])}
                          data-test-subj="detectionTimelineRelatedActivity"
                        >
                          {source.title} → {target.title}
                        </EuiButtonEmpty>
                        <EuiText size="xs" color="subdued">
                          <p>{connection.label}</p>
                        </EuiText>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}
        <div
          css={css`
            flex-shrink: 0;
            padding: ${euiTheme.size.s} ${euiTheme.size.l};
            border-top: 1px solid ${euiTheme.colors.borderBasePlain};
          `}
        >
          <EuiText size="xs" color="subdued">
            <p>{feed.length === 0 ? labels.noTimelineActivity : labels.timelineHistory}</p>
            {mode === 'lanes' && (
              <p>
                {i18n.translate('xpack.significantEventsApp.timeline.connectionHelp', {
                  defaultMessage:
                    '{count, plural, =0 {No linked activity in this range.} one {# connection.} other {# connections.}} Lines show stored knowledge, rule and event references.',
                  values: { count: connections.length },
                })}
              </p>
            )}
          </EuiText>
        </div>
      </EuiPanel>
      {activityDetail && (
        <WorkspaceDrawer
          title={activityDetail.title}
          description={`${timestampLabel(activityDetail.timestamp)} · ${kindLabel(
            activityDetail.kind
          )}`}
          onClose={() => setActivityDetail(undefined)}
          testSubject="detectionTimelineActivityFlyout"
        >
          {entryTooltip(activityDetail)}
        </WorkspaceDrawer>
      )}
    </div>
  );
};
