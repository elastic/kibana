/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodexSession, CodexToolSummary } from './codex_types';

export interface SessionGraphOptions {
  maxLinkedSessions?: number;
  maxOtherSessions?: number;
  maxTools?: number;
  includeReviewSessions?: boolean;
  includeOtherSessions?: boolean;
}

export interface SessionGraphNode {
  key: string;
  session: CodexSession;
  group: 'selected_tree' | 'other';
  selected: boolean;
  parentState: 'linked' | 'not_recorded' | 'missing' | 'cycle' | 'outside_view';
  x: number;
  y: number;
}

export interface SessionGraphEdge {
  source: string;
  target: string;
}

export interface SessionGraphTool extends CodexToolSummary {
  x: number;
  y: number;
}

export interface SessionGraphModel {
  sessions: SessionGraphNode[];
  parentEdges: SessionGraphEdge[];
  roots: string[];
  tools: SessionGraphTool[];
  installation: { x: number; y: number };
  owner: { x: number; y: number };
  width: number;
  height: number;
  toolLaneY: number;
  otherLaneY: number;
  omittedSessions: number;
  omittedTools: number;
  otherInstallationSessions: number;
  cyclicParentLinks: number;
  reviewSessionCount: number;
  hiddenReviewSessions: number;
  otherSessionCount: number;
}

export const SESSION_GRAPH_CARD = { width: 184, height: 64 } as const;
export const SESSION_GRAPH_TOOL_CARD = { width: 136, height: 64 } as const;

export const sessionGraphKey = (session: Pick<CodexSession, 'agentId' | 'id'>): string =>
  JSON.stringify([session.agentId, session.id]);

const boundedCount = (value: number | undefined, fallback: number, maximum: number): number =>
  value !== undefined && Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, Math.floor(value)))
    : fallback;

const recentFirst = (left: CodexSession, right: CodexSession): number =>
  Date.parse(right.lastSeen) - Date.parse(left.lastSeen) ||
  sessionGraphKey(left).localeCompare(sessionGraphKey(right));

/** Builds a bounded installation-scoped view using only recorded session parent references and tool totals. */
export const buildSessionGraph = (
  sessions: CodexSession[],
  selected: CodexSession,
  options: SessionGraphOptions = {}
): SessionGraphModel => {
  const maxLinked = Math.max(1, boundedCount(options.maxLinkedSessions, 12, 24));
  const maxOther = boundedCount(options.maxOtherSessions, 3, 6);
  const maxTools = boundedCount(options.maxTools, 6, 10);
  const byKey = new Map<string, CodexSession>();
  [...sessions].sort(recentFirst).forEach((session) => {
    if (session.agentId !== selected.agentId) return;
    const key = sessionGraphKey(session);
    if (!byKey.has(key)) byKey.set(key, session);
  });
  const selectedKey = sessionGraphKey(selected);
  byKey.set(selectedKey, selected);
  const parents = new Map<string, string>();
  byKey.forEach((session, key) => {
    if (!session.parentId) return;
    const parentKey = sessionGraphKey({ agentId: session.agentId, id: session.parentId });
    if (byKey.has(parentKey)) parents.set(key, parentKey);
  });
  const cyclic = new Set<string>();
  const examined = new Set<string>();
  byKey.forEach((session, key) => {
    const path: string[] = [];
    const positions = new Map<string, number>();
    let cursor: string | undefined = key;
    while (cursor && !examined.has(cursor)) {
      const position = positions.get(cursor);
      if (position !== undefined) {
        path.slice(position).forEach((item) => cyclic.add(item));
        break;
      }
      positions.set(cursor, path.length);
      path.push(cursor);
      cursor = parents.get(cursor);
    }
    path.forEach((item) => examined.add(item));
  });
  cyclic.forEach((key) => parents.delete(key));
  const reviewSessionCount = [...byKey.values()].filter(
    (session) => session.role === 'guardian_review'
  ).length;
  const required = new Set<string>([selectedKey]);
  byKey.forEach((session, key) => {
    if (session.role !== 'guardian_review') required.add(key);
  });
  [...required].forEach((key) => {
    let parent = parents.get(key);
    while (parent && !required.has(parent)) {
      required.add(parent);
      parent = parents.get(parent);
    }
  });
  let hiddenReviewSessions = 0;
  if (!options.includeReviewSessions) {
    byKey.forEach((session, key) => {
      if (session.role === 'guardian_review' && !required.has(key)) {
        byKey.delete(key);
        hiddenReviewSessions += 1;
      }
    });
    parents.forEach((parent, child) => {
      if (!byKey.has(child) || !byKey.has(parent)) parents.delete(child);
    });
  }
  const children = new Map<string, string[]>();
  parents.forEach((parent, child) =>
    children.set(parent, [...(children.get(parent) ?? []), child])
  );
  children.forEach((values) =>
    values.sort((left, right) => {
      const leftSession = byKey.get(left);
      const rightSession = byKey.get(right);
      return leftSession && rightSession
        ? recentFirst(leftSession, rightSession)
        : left.localeCompare(right);
    })
  );

  const component = new Set<string>();
  const pending = [selectedKey];
  for (let index = 0; index < pending.length; index++) {
    const key = pending[index];
    if (!component.has(key)) {
      component.add(key);
      const parent = parents.get(key);
      if (parent) pending.push(parent);
      pending.push(...(children.get(key) ?? []));
    }
  }
  const included = new Set<string>([selectedKey]);
  let ancestor = parents.get(selectedKey);
  while (ancestor && included.size < maxLinked) {
    included.add(ancestor);
    ancestor = parents.get(ancestor);
  }
  const nearby = [...included];
  for (let index = 0; index < nearby.length && included.size < maxLinked; index++) {
    (children.get(nearby[index]) ?? []).forEach((key) => {
      if (included.size >= maxLinked || included.has(key)) return;
      included.add(key);
      nearby.push(key);
    });
  }
  const otherSessionCount = byKey.size - component.size;
  const other = (options.includeOtherSessions ? [...byKey] : [])
    .filter(([key]) => !component.has(key) && !parents.has(key))
    .sort((left, right) => recentFirst(left[1], right[1]))
    .slice(0, maxOther)
    .map(([key]) => key);
  const roots = [...included].filter((key) => !included.has(parents.get(key) ?? ''));
  const positions = new Map<string, { x: number; y: number }>();
  let row = 0;
  const place = (key: string, depth: number): number => {
    const descendants = (children.get(key) ?? [])
      .filter((child) => included.has(child))
      .sort((left, right) => {
        const leftSession = byKey.get(left);
        const rightSession = byKey.get(right);
        return leftSession && rightSession
          ? (leftSession.agentPath ?? '').localeCompare(rightSession.agentPath ?? '') ||
              leftSession.start.localeCompare(rightSession.start) ||
              left.localeCompare(right)
          : left.localeCompare(right);
      });
    const childPositions = descendants.map((child) => place(child, depth + 1));
    const y = childPositions.length
      ? (childPositions[0] + childPositions[childPositions.length - 1]) / 2
      : 40 + row++ * 78;
    positions.set(key, { x: 370 + depth * 220, y });
    return y;
  };
  roots.forEach((key) => place(key, 0));
  const focusBottom = Math.max(
    146,
    ...[...positions.values()].map(({ y }) => y + SESSION_GRAPH_CARD.height)
  );
  const toolLaneY = focusBottom + 62;
  const toolSummaries = new Map<string, CodexToolSummary>();
  selected.tools.forEach((tool) => {
    if (!tool.name || tool.count <= 0) return;
    const previous = toolSummaries.get(tool.name);
    toolSummaries.set(tool.name, {
      name: tool.name,
      count: (previous?.count ?? 0) + tool.count,
      success_count: (previous?.success_count ?? 0) + tool.success_count,
      failure_count: (previous?.failure_count ?? 0) + tool.failure_count,
      unknown_count: (previous?.unknown_count ?? 0) + tool.unknown_count,
    });
  });
  const allTools = [...toolSummaries.values()].sort(
    (left, right) => right.count - left.count || left.name.localeCompare(right.name)
  );
  const tools = allTools
    .slice(0, maxTools)
    .map((tool, index) => ({ ...tool, x: 180 + index * 146, y: toolLaneY }));
  const otherLaneY = toolLaneY + (tools.length ? 150 : 24);
  other.forEach((key, index) => positions.set(key, { x: 180 + index * 202, y: otherLaneY }));
  const nodes: SessionGraphNode[] = [...included, ...other].flatMap((key) => {
    const session = byKey.get(key);
    const position = positions.get(key);
    if (!session || !position) return [];
    const parent = parents.get(key);
    return [
      {
        key,
        session,
        group: included.has(key) ? 'selected_tree' : 'other',
        selected: key === selectedKey,
        parentState: !session.parentId
          ? 'not_recorded'
          : cyclic.has(key)
          ? 'cycle'
          : !parent
          ? 'missing'
          : included.has(parent)
          ? 'linked'
          : 'outside_view',
        ...position,
      },
    ];
  });
  const rootY = roots.length ? positions.get(roots[0])?.y ?? 40 : 40;
  return {
    sessions: nodes,
    parentEdges: [...parents]
      .filter(([child, parent]) => included.has(child) && included.has(parent))
      .map(([target, source]) => ({ source, target })),
    roots,
    tools,
    installation: { x: 180, y: rootY },
    owner: { x: 20, y: rootY },
    width: Math.max(
      920,
      ...nodes
        .filter((node) => node.group === 'selected_tree')
        .map(({ x }) => x + SESSION_GRAPH_CARD.width + 28),
      ...tools.map(({ x }) => x + SESSION_GRAPH_TOOL_CARD.width + 28)
    ),
    height: Math.max(
      430,
      tools.length ? toolLaneY + SESSION_GRAPH_TOOL_CARD.height + 28 : focusBottom + 40
    ),
    toolLaneY,
    otherLaneY,
    omittedSessions: Math.max(0, component.size - included.size),
    omittedTools: Math.max(0, allTools.length - tools.length),
    otherInstallationSessions: sessions.filter((session) => session.agentId !== selected.agentId)
      .length,
    cyclicParentLinks: cyclic.size,
    reviewSessionCount,
    hiddenReviewSessions,
    otherSessionCount,
  };
};
