/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSessionGraph, sessionGraphKey, SESSION_GRAPH_CARD } from './session_graph_model';
import type { CodexSession } from './codex_types';

const session = (id: string, overrides: Partial<CodexSession> = {}): CodexSession => ({
  id,
  agentId: 'install-a',
  model: 'gpt-6',
  start: '2026-10-12T12:00:00Z',
  lastSeen: '2026-10-12T13:00:00Z',
  toolCount: 5,
  failures: 1,
  successes: 3,
  unknowns: 1,
  completedTurns: 1,
  abortedTurns: 0,
  tools: [{ name: 'exec_command', count: 5, failure_count: 1, success_count: 3, unknown_count: 1 }],
  summaryComplete: true,
  source: { index: 'codex-test', id },
  fileHash: 'hash',
  ...overrides,
});

it('stitches only recorded parentage and includes the selected ancestors, siblings, and children', () => {
  const root = session('root');
  const selected = session('selected', { parentId: 'root' });
  const sibling = session('sibling', { parentId: 'root' });
  const child = session('child', { parentId: 'selected' });
  const model = buildSessionGraph([root, selected, sibling, child], selected);
  expect(model.parentEdges).toEqual(
    expect.arrayContaining([
      { source: sessionGraphKey(root), target: sessionGraphKey(selected) },
      { source: sessionGraphKey(root), target: sessionGraphKey(sibling) },
      { source: sessionGraphKey(selected), target: sessionGraphKey(child) },
    ])
  );
  expect(model.parentEdges).toHaveLength(3);
  expect(model.sessions.find((node) => node.selected)?.session).toBe(selected);
  expect(model.sessions.every((node) => node.group === 'selected_tree')).toBe(true);
});

it('never joins identical session IDs or parent references across installations', () => {
  const selected = session('child', { parentId: 'root' });
  const otherRoot = session('root', { agentId: 'install-b' });
  const otherSelected = session('child', { agentId: 'install-b', parentId: 'root' });
  const model = buildSessionGraph([selected, otherRoot, otherSelected], selected);
  expect(model.sessions).toHaveLength(1);
  expect(model.sessions[0].parentState).toBe('missing');
  expect(model.parentEdges).toEqual([]);
  expect(model.otherInstallationSessions).toBe(2);
});

it('removes cyclic parent edges without losing the selected session or fabricating a root', () => {
  const first = session('first', { parentId: 'second' });
  const second = session('second', { parentId: 'first' });
  const child = session('child', { parentId: 'first' });
  const model = buildSessionGraph([first, second, child], first, { includeOtherSessions: true });
  expect(model.cyclicParentLinks).toBe(2);
  expect(model.parentEdges).toEqual([
    { source: sessionGraphKey(first), target: sessionGraphKey(child) },
  ]);
  expect(model.sessions.find((node) => node.session.id === 'first')?.parentState).toBe('cycle');
  expect(model.sessions.find((node) => node.session.id === 'second')?.group).toBe('other');
  const self = session('self', { parentId: 'self' });
  expect(buildSessionGraph([self], self).parentEdges).toEqual([]);
});

it('keeps unrelated trees visibly separate and does not infer edges from model, tool, or temporal proximity', () => {
  const selected = session('selected');
  const unrelated = session('unrelated');
  const unrelatedChild = session('unrelated-child', { parentId: 'unrelated' });
  const sessions = [selected, unrelated, unrelatedChild];
  const collapsed = buildSessionGraph(sessions, selected);
  expect(collapsed.sessions).toHaveLength(1);
  expect(collapsed.otherSessionCount).toBe(2);
  const model = buildSessionGraph(sessions, selected, { includeOtherSessions: true });
  expect(model.parentEdges).toEqual([]);
  expect(model.sessions.find((node) => node.session.id === 'unrelated')?.group).toBe('other');
  expect(model.sessions.find((node) => node.session.id === 'unrelated-child')).toBeUndefined();
  expect(model.omittedSessions).toBe(0);
  expect(model.height).toBe(collapsed.height);
});

it('bounds large hierarchies, prioritizes ancestors, and reports omitted context', () => {
  const chain = Array.from({ length: 30 }, (_, index) =>
    session(`session-${index}`, { parentId: index ? `session-${index - 1}` : undefined })
  );
  const selected = chain[29];
  const model = buildSessionGraph(chain, selected, { maxLinkedSessions: 4, maxOtherSessions: 0 });
  expect(model.sessions).toHaveLength(4);
  expect(model.sessions.map((node) => node.session.id)).toEqual([
    'session-29',
    'session-28',
    'session-27',
    'session-26',
  ]);
  expect(model.sessions.find((node) => node.session.id === 'session-26')?.parentState).toBe(
    'outside_view'
  );
  expect(model.parentEdges).toHaveLength(3);
  expect(model.omittedSessions).toBe(26);
  expect(model.width).toBeGreaterThan(0);
  expect(model.height).toBeGreaterThanOrEqual(430);
});

it('deduplicates session identities and uses the exact selected snapshot', () => {
  const old = session('selected', { lastSeen: '2026-10-12T12:30:00Z' });
  const selected = session('selected', { toolCount: 20 });
  const model = buildSessionGraph([old, selected, old], selected);
  expect(model.sessions).toHaveLength(1);
  expect(model.sessions[0].session.toolCount).toBe(20);
  expect(model.omittedSessions).toBe(0);
});

it('shows only the selected session tool counts and preserves failures and unknowns without causal joins', () => {
  const selected = session('selected');
  const child = session('child', {
    parentId: 'selected',
    tools: [
      { name: 'apply_patch', count: 100, success_count: 100, failure_count: 0, unknown_count: 0 },
    ],
  });
  const model = buildSessionGraph([selected, child], selected);
  expect(model.tools).toEqual([
    expect.objectContaining({
      name: 'exec_command',
      count: 5,
      failure_count: 1,
      success_count: 3,
      unknown_count: 1,
    }),
  ]);
  expect(model.tools.some((tool) => tool.name === 'apply_patch')).toBe(false);
  expect(model.parentEdges).toHaveLength(1);
});

it('caps distinct observed tools and aggregates duplicate summary entries without inventing events', () => {
  const selected = session('selected', {
    tools: [
      { name: 'first', count: 3, success_count: 2, failure_count: 0, unknown_count: 1 },
      { name: 'first', count: 2, success_count: 0, failure_count: 2, unknown_count: 0 },
      { name: 'second', count: 1, success_count: 1, failure_count: 0, unknown_count: 0 },
    ],
  });
  const model = buildSessionGraph([selected], selected, { maxTools: 1 });
  expect(model.tools[0]).toMatchObject({
    name: 'first',
    count: 5,
    success_count: 2,
    failure_count: 2,
    unknown_count: 1,
  });
  expect(model.omittedTools).toBe(1);
});

it('lays out siblings without overlapping cards and keeps tool and other-session lanes below the tree', () => {
  const selected = session('root');
  const children = Array.from({ length: 8 }, (_, index) =>
    session(`child-${index}`, { parentId: 'root' })
  );
  const model = buildSessionGraph([selected, ...children, session('unlinked')], selected);
  const siblings = model.sessions.filter((node) => node.session.parentId === 'root');
  const ordered = [...siblings].sort((left, right) => left.y - right.y);
  ordered
    .slice(1)
    .forEach((node, index) =>
      expect(node.y).toBeGreaterThanOrEqual(ordered[index].y + SESSION_GRAPH_CARD.height)
    );
  expect(model.toolLaneY).toBeGreaterThan(
    Math.max(
      ...model.sessions
        .filter((node) => node.group === 'selected_tree')
        .map((node) => node.y + SESSION_GRAPH_CARD.height)
    )
  );
  expect(model.otherLaneY).toBeGreaterThan(model.toolLaneY);
});

it('keeps the main session, named subagents, and six tools within a laptop canvas by default', () => {
  const selected = session('root', {
    role: 'user',
    tools: Array.from({ length: 6 }, (_, index) => ({
      name: `tool-${index}`,
      count: 5,
      failure_count: 1,
      success_count: 3,
      unknown_count: 1,
    })),
  });
  const children = ['identity_readiness', 'accuracy_review', 'agent_telemetry'].map((name) =>
    session(name, { parentId: 'root', role: 'subagent', agentPath: `/root/${name}` })
  );
  const reviews = Array.from({ length: 30 }, (_, index) =>
    session(`review-${index}`, { parentId: 'root', role: 'guardian_review' })
  );
  const sessions = [selected, ...children, ...reviews];
  const model = buildSessionGraph(sessions, selected);
  expect(model.sessions).toHaveLength(4);
  expect(model.parentEdges).toHaveLength(3);
  expect(model.tools).toHaveLength(6);
  expect(model.reviewSessionCount).toBe(30);
  expect(model.hiddenReviewSessions).toBe(30);
  expect(model.height).toBeLessThanOrEqual(460);
  expect(model.width).toBeLessThanOrEqual(1120);
  const expanded = buildSessionGraph(sessions, selected, { includeReviewSessions: true });
  expect(expanded.sessions).toHaveLength(12);
  expect(expanded.hiddenReviewSessions).toBe(0);
  expect(expanded.omittedSessions).toBe(22);
});

it('retains selected review sessions and required review ancestors with their recorded edges', () => {
  const root = session('root', { role: 'user' });
  const review = session('review', { parentId: 'root', role: 'guardian_review' });
  const child = session('child', { parentId: 'review', role: 'subagent' });
  const unrelatedReview = session('other-review', { parentId: 'root', role: 'guardian_review' });
  const model = buildSessionGraph([root, review, child, unrelatedReview], child);
  expect(model.sessions).toHaveLength(3);
  expect(model.hiddenReviewSessions).toBe(1);
  expect(model.parentEdges).toEqual(
    expect.arrayContaining([
      { source: sessionGraphKey(root), target: sessionGraphKey(review) },
      { source: sessionGraphKey(review), target: sessionGraphKey(child) },
    ])
  );
  const selectedReview = buildSessionGraph([root, unrelatedReview], unrelatedReview);
  expect(selectedReview.sessions).toHaveLength(2);
  expect(selectedReview.hiddenReviewSessions).toBe(0);
});

it('keeps the layout of visible siblings stable when collector timestamps change', () => {
  const root = session('root', { role: 'user' });
  const children = ['sartre', 'euler', 'erdos'].map((name, index) =>
    session(name, {
      parentId: 'root',
      role: 'subagent',
      agentPath: `/root/${name}`,
      lastSeen: `2026-10-12T13:0${index}:00Z`,
    })
  );
  const first = buildSessionGraph([root, ...children], root);
  const second = buildSessionGraph(
    [
      root,
      ...children.map((child, index) => ({
        ...child,
        lastSeen: `2026-10-12T13:0${5 - index}:00Z`,
      })),
    ],
    root
  );
  first.sessions.forEach((node) => {
    expect(second.sessions.find((candidate) => candidate.key === node.key)).toMatchObject({
      x: node.x,
      y: node.y,
    });
  });
});
