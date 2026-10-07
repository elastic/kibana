/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  Detection,
  Feature,
  QueryWithOccurrences,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import type { useDetectionData } from './use_detection_data';

export type KnowledgeActivity = NonNullable<
  ReturnType<typeof useDetectionData>['data']
>['activity']['activities'][number];
export type TimelineKind = 'knowledge' | 'rule' | 'matches' | 'detection' | 'event' | 'engine';
export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  timestamp: number;
  title: string;
  entity: string;
  stream?: string;
  indicatorId?: string;
  relatedEntryId?: string;
  count?: number;
  activityKind?: KnowledgeActivity['kind'];
  detection?: Detection;
  feature?: Feature;
  query?: QueryWithOccurrences;
  event?: SignificantEventResponse;
}
export interface TimelineConnection {
  source: string;
  target: string;
  label: string;
}

/** Links stored indicator and signal references, without treating time proximity as causality. */
export const buildTimelineConnections = (entries: TimelineEntry[]): TimelineConnection[] => {
  const unique = [...new Map(entries.map((entry) => [entry.id, entry])).values()].sort(
    (left, right) => left.timestamp - right.timestamp
  );
  const byId = new Map(unique.map((entry) => [entry.id, entry]));
  const knowledge = new Map<string, TimelineEntry[]>();
  const rules = new Map<string, TimelineEntry[]>();
  for (const entry of unique) {
    if (entry.kind !== 'knowledge' && entry.kind !== 'rule') continue;
    const stream = entry.stream || entry.feature?.stream_name || entry.query?.stream_name;
    const id =
      (entry.kind === 'knowledge' ? entry.feature?.id : entry.query?.id) || entry.indicatorId;
    if (!stream || !id) continue;
    const index = entry.kind === 'knowledge' ? knowledge : rules;
    const key = JSON.stringify([stream, id]);
    index.set(key, [...(index.get(key) ?? []), entry]);
  }
  const connections = new Map<string, TimelineConnection>();
  const connect = (
    source: TimelineEntry | undefined,
    target: TimelineEntry,
    label: string
  ): void => {
    if (!source || source.id === target.id) return;
    const key = JSON.stringify([source.id, target.id]);
    connections.set(key, { source: source.id, target: target.id, label });
  };
  const prior = (
    candidates: TimelineEntry[] | undefined,
    target: TimelineEntry
  ): TimelineEntry | undefined =>
    candidates
      ?.filter((entry) => entry.timestamp <= target.timestamp && entry.id !== target.id)
      .at(-1);

  for (const entry of unique) {
    if (entry.relatedEntryId) {
      connect(
        byId.get(entry.relatedEntryId),
        entry,
        i18n.translate('xpack.significantEventsApp.timeline.connection.lifecycle', {
          defaultMessage: 'Same event or workflow',
        })
      );
    }
    if (entry.kind === 'rule' && entry.query) {
      for (const reference of entry.query.features ?? []) {
        connect(
          prior(knowledge.get(JSON.stringify([entry.query.stream_name, reference.id])), entry),
          entry,
          i18n.translate('xpack.significantEventsApp.timeline.connection.knowledgeRule', {
            defaultMessage: 'Knowledge referenced by this rule',
          })
        );
      }
    }
    if (entry.kind === 'detection' && entry.query) {
      connect(
        prior(rules.get(JSON.stringify([entry.query.stream_name, entry.query.id])), entry),
        entry,
        i18n.translate('xpack.significantEventsApp.timeline.connection.ruleDetection', {
          defaultMessage: 'Detection from this rule',
        })
      );
    }
    if (entry.kind !== 'event' || !entry.event || !entry.id.startsWith('event:')) continue;
    for (const signal of entry.event.signals ?? []) {
      const detection = byId.get(`detection:${signal.metadata.detection_id}`);
      const state = byId.get(`event-state:${entry.event.event_uuid}`);
      const target = detection && detection.timestamp > entry.timestamp && state ? state : entry;
      connect(
        detection,
        target,
        i18n.translate('xpack.significantEventsApp.timeline.connection.detectionEvent', {
          defaultMessage: 'Detection included in this significant event',
        })
      );
    }
    for (const reference of entry.event.causal_features ?? []) {
      connect(
        prior(knowledge.get(JSON.stringify([reference.stream_name, reference.feature_id])), entry),
        entry,
        i18n.translate('xpack.significantEventsApp.timeline.connection.knowledgeEvent', {
          defaultMessage: 'Knowledge referenced by this significant event',
        })
      );
    }
  }
  return [...connections.values()];
};
