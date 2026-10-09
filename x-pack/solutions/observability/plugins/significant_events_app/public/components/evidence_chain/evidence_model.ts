/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Detection,
  Feature,
  QueryWithOccurrences,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { buildDetectionModel } from '../../pages/detection/model';
import type { EvidenceData, EvidenceTarget } from './evidence_context';

export type EvidenceFocus =
  | { kind: 'source'; stream: string }
  | { kind: 'feature'; feature: Feature }
  | { kind: 'rule'; rule: QueryWithOccurrences }
  | { kind: 'detection'; detection: Detection }
  | { kind: 'event'; event: SignificantEventResponse };
export interface EvidenceNode {
  id: string;
  stage: number;
  title: string;
  detail: string;
  target: EvidenceTarget;
  selected: boolean;
  unavailable?: boolean;
  referenceRuns?: string[];
}
export interface EvidenceEdge {
  source: string;
  target: string;
  context?: boolean;
}

/** Traces stored references, keeping service context distinct from generation provenance. */
export const buildEvidenceGraph = (
  focus: EvidenceFocus,
  data: EvidenceData
): { nodes: EvidenceNode[]; edges: EvidenceEdge[] } => {
  const nodes = new Map<string, EvidenceNode>();
  const edges: EvidenceEdge[] = [];
  const features = [...data.features];
  const queries = [...data.queries];
  const detections = [...data.detections];
  const events = [...data.events];
  if (focus.kind === 'feature' && !features.some((f) => f.uuid === focus.feature.uuid))
    features.push(focus.feature);
  if (focus.kind === 'rule' && !queries.some((q) => q.id === focus.rule.id))
    queries.push(focus.rule);
  if (
    focus.kind === 'detection' &&
    !detections.some((d) => d.detection_id === focus.detection.detection_id)
  )
    detections.push(focus.detection);
  if (focus.kind === 'event' && !events.some((e) => e.event_id === focus.event.event_id))
    events.push(focus.event);
  const relatedRules = new Set<string>();
  const relatedDetections = new Set<string>();
  const relatedEvents = new Set<string>();
  if (focus.kind === 'feature') {
    queries
      .filter(
        (q) =>
          q.stream_name === focus.feature.stream_name &&
          q.features.some((f) => f.id === focus.feature.id || f.id === focus.feature.uuid)
      )
      .forEach((q) => relatedRules.add(q.id));
  }
  if (focus.kind === 'source')
    queries
      .filter((query) => query.stream_name === focus.stream)
      .forEach((query) => relatedRules.add(query.id));
  if (focus.kind === 'rule') relatedRules.add(focus.rule.id);
  if (focus.kind === 'detection') {
    relatedDetections.add(focus.detection.detection_id);
    queries
      .filter((q) => q.rule_uuid === focus.detection.rule_uuid)
      .forEach((q) => relatedRules.add(q.id));
  }
  if (focus.kind === 'event') {
    relatedEvents.add(focus.event.event_id);
    focus.event.signals.forEach((s) => {
      relatedDetections.add(s.metadata.detection_id);
      queries
        .filter((q) => q.rule_uuid === s.metadata.rule_uuid)
        .forEach((q) => relatedRules.add(q.id));
    });
  } else {
    if (focus.kind !== 'detection')
      detections
        .filter((d) => queries.some((q) => relatedRules.has(q.id) && q.rule_uuid === d.rule_uuid))
        .forEach((d) => relatedDetections.add(d.detection_id));
    events
      .filter((e) => e.signals.some((s) => relatedDetections.has(s.metadata.detection_id)))
      .forEach((e) => relatedEvents.add(e.event_id));
  }
  const selectedId =
    focus.kind === 'source'
      ? `source:${focus.stream}`
      : focus.kind === 'feature'
      ? `feature:${focus.feature.stream_name}:${focus.feature.id}`
      : focus.kind === 'rule'
      ? `rule:${focus.rule.id}`
      : focus.kind === 'detection'
      ? `detection:${focus.detection.detection_id}`
      : `event:${focus.event.event_id}`;
  const add = (node: Omit<EvidenceNode, 'selected'>): string => {
    nodes.set(node.id, {
      ...node,
      referenceRuns: nodes.get(node.id)?.referenceRuns,
      selected: node.id === selectedId,
    });
    return node.id;
  };
  const link = (source: string, target: string, context = false): void => {
    if (!edges.some((e) => e.source === source && e.target === target))
      edges.push({ source, target, context });
  };
  const source = (stream: string): string =>
    add({
      id: `source:${stream}`,
      stage: 0,
      title: stream,
      detail: '',
      target: { kind: 'source', id: stream, stream },
    });
  const feature = (id: string, stream?: string): string => {
    const candidates = features.filter(
      (f) => (!stream || f.stream_name === stream) && (f.id === id || f.uuid === id)
    );
    const item = candidates.length === 1 ? candidates[0] : undefined;
    stream = stream || item?.stream_name;
    const nodeId = `feature:${stream}:${item?.id ?? id}`;
    add({
      id: nodeId,
      stage: 2,
      title: item?.title || id,
      detail: item ? `${item.type.replaceAll('_', ' ')} · ${item.confidence}%` : '',
      unavailable: !item,
      target: { kind: 'feature', id: item?.id ?? id, stream },
    });
    if (stream) link(source(stream), nodeId);
    return nodeId;
  };
  for (const q of queries.filter((candidate) => relatedRules.has(candidate.id))) {
    const nodeId = add({
      id: `rule:${q.id}`,
      stage: 3,
      title: q.title,
      detail: q.type,
      target: { kind: 'rule', id: q.rule_uuid || q.id, stream: q.stream_name },
    });
    link(source(q.stream_name), nodeId);
    q.features.forEach((ref) => {
      const featureId = feature(ref.id, q.stream_name);
      link(featureId, nodeId);
      const current = features.find(
        (item) => item.stream_name === q.stream_name && (item.id === ref.id || item.uuid === ref.id)
      );
      const linked = nodes.get(featureId);
      if (linked && current && ref.run_id && ref.run_id !== current.run_id)
        linked.referenceRuns = [...new Set([...(linked.referenceRuns ?? []), ref.run_id])];
    });
  }
  if (focus.kind === 'feature') feature(focus.feature.id, focus.feature.stream_name);
  if (focus.kind === 'source') {
    source(focus.stream);
    features
      .filter((item) => item.stream_name === focus.stream)
      .forEach((item) => feature(item.id, item.stream_name));
  }
  for (const d of detections.filter((candidate) => relatedDetections.has(candidate.detection_id))) {
    const nodeId = add({
      id: `detection:${d.detection_id}`,
      stage: 4,
      title: d.rule_name || d.rule_uuid,
      detail: d.change_point_type.replaceAll('_', ' '),
      target: { kind: 'detection', id: d.detection_id, ruleId: d.rule_uuid, stream: d.stream_name },
    });
    const q = queries.find((rule) => rule.rule_uuid === d.rule_uuid);
    if (q) link(`rule:${q.id}`, nodeId);
    else {
      const rule = add({
        id: `rule:${d.rule_uuid}`,
        stage: 3,
        title: d.rule_name || d.rule_uuid,
        detail: '',
        unavailable: true,
        target: { kind: 'rule', id: d.rule_uuid, stream: d.stream_name },
      });
      link(source(d.stream_name), rule);
      link(rule, nodeId);
    }
  }
  for (const e of events.filter((candidate) => relatedEvents.has(candidate.event_id))) {
    const eventId = add({
      id: `event:${e.event_id}`,
      stage: 5,
      title: e.title,
      detail: e.status,
      target: { kind: 'event', id: e.event_id },
    });
    for (const s of e.signals.filter(
      (candidate) =>
        focus.kind === 'event' || relatedDetections.has(candidate.metadata.detection_id)
    )) {
      const detectionId = `detection:${s.metadata.detection_id}`;
      if (!nodes.has(detectionId))
        add({
          id: detectionId,
          stage: 4,
          title: s.metadata.rule_name,
          detail: s.metadata.change_point_type.replaceAll('_', ' '),
          target: {
            kind: 'detection',
            id: s.metadata.detection_id,
            ruleId: s.metadata.rule_uuid,
            stream: s.stream_name,
          },
        });
      const rule = queries.find((q) => q.rule_uuid === s.metadata.rule_uuid);
      const ruleId = rule
        ? `rule:${rule.id}`
        : add({
            id: `rule:${s.metadata.rule_uuid}`,
            stage: 3,
            title: s.metadata.rule_name,
            detail: '',
            unavailable: true,
            target: { kind: 'rule', id: s.metadata.rule_uuid, stream: s.stream_name },
          });
      if (!rule) link(source(s.stream_name), ruleId);
      link(ruleId, detectionId);
      link(detectionId, eventId);
    }
    e.causal_features?.forEach((ref) =>
      link(feature(ref.feature_id, ref.stream_name), eventId, true)
    );
    e.blast_radius?.forEach((ref) => link(feature(ref.feature_id, ref.stream_name), eventId, true));
  }
  const model = buildDetectionModel(features, queries, detections, events);
  for (const entity of model.entities) {
    const associated = [...nodes.values()].filter(
      (n) =>
        n.stage >= 2 && n.stage <= 3 && n.target.stream && entity.streams.includes(n.target.stream)
    );
    if (!associated.length) continue;
    const serviceId = add({
      id: `service:${entity.id}`,
      stage: 1,
      title: entity.label,
      detail: entity.namespace,
      target: { kind: 'service', id: entity.id },
    });
    associated.forEach((n) => link(serviceId, n.id, true));
    entity.features
      .filter((f) => f.type === 'entity' && entity.streams.includes(f.stream_name))
      .forEach((f) => {
        const featureId = feature(f.id, f.stream_name);
        link(featureId, serviceId, true);
      });
  }
  return {
    nodes: [...nodes.values()].sort(
      (a, b) =>
        a.stage - b.stage ||
        Number(b.selected) - Number(a.selected) ||
        a.title.localeCompare(b.title)
    ),
    edges,
  };
};
