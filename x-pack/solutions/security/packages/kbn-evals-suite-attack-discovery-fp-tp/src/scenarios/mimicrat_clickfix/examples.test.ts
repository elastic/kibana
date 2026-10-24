/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpWorld } from '../../world';
import { buildFpTpExampleWorld } from '..';
import { FP_TP_RAW_EVENT_PAGE_SIZE } from '../../world';
import { MIMICRAT_STAGE2_DOMAIN } from './chain';
import { MIMICRAT_EXAMPLES } from './examples';

interface EventSource {
  readonly event?: { readonly category?: readonly string[] };
  readonly process?: { readonly parent?: { readonly name?: string } };
  readonly destination?: { readonly domain?: string };
}

const CHAIN_PROCESSES = new Set(['powershell.exe', 'zbuild.exe']);
const USER_PARENTS = new Set(['explorer.exe']);
const MANAGEMENT_PARENTS = new Set(['ccmexec.exe', 'agentexecutor.exe']);
const VENDOR_DESTINATIONS = new Set(['manage.microsoft.com', 'sccm-dp-02.corp.local']);

const eventSources = (world: FpTpWorld): EventSource[] =>
  world.events.map(({ source }) => source as EventSource);

/** Reads each world check from the seeded evidence, independently of the declared labels. */
const observedChecks = (world: FpTpWorld): Record<string, string> => {
  const host = world.entities.find(
    ({ source }) => (source.entity as { type?: string }).type === 'host'
  );
  const subType = (host?.source.entity as { sub_type?: string } | undefined)?.sub_type;
  const entityRole = !host
    ? 'skipped'
    : subType === undefined
    ? 'neutral'
    : subType === 'employee_workstation'
    ? 'supports'
    : 'contradicts';

  const sources = eventSources(world);
  const parents = sources
    .map(({ process }) => process?.parent?.name?.toLowerCase())
    .filter((name): name is string => name !== undefined && !CHAIN_PROCESSES.has(name));
  const byUser = parents.some((name) => USER_PARENTS.has(name));
  const byManagement = parents.some((name) => MANAGEMENT_PARENTS.has(name));
  const processParent =
    sources.length === 0
      ? 'skipped'
      : byUser && byManagement
      ? 'conflicting'
      : byManagement
      ? 'contradicts'
      : byUser
      ? 'supports'
      : 'neutral';

  const domains = sources
    .filter(({ event }) => event?.category?.includes('network'))
    .map(({ destination }) => destination?.domain?.toLowerCase() ?? '');
  const vendor = domains.filter((domain) => VENDOR_DESTINATIONS.has(domain)).length;
  const networkDestination =
    sources.length === 0
      ? 'skipped'
      : domains.length === 0
      ? 'neutral'
      : vendor === domains.length
      ? 'contradicts'
      : vendor === 0
      ? 'supports'
      : 'conflicting';

  return { entityRole, processParent, networkDestination };
};

/** The workflow's per-alert window: ±2h around the alert's original_time, on its host. */
const WINDOW_MS = 2 * 3_600_000;

const eventsInWindow = (world: FpTpWorld, alertIndex: number): Array<{ source: Record<string, unknown> }> => {
  const byTime = [...world.alerts].sort(
    (left, right) =>
      Date.parse(String(left.source['kibana.alert.original_time'])) -
      Date.parse(String(right.source['kibana.alert.original_time']))
  );
  const anchor = Date.parse(String(byTime[alertIndex].source['kibana.alert.original_time']));
  return world.events
    .filter((event) => {
      const time = Date.parse(String(event.source['@timestamp']));
      return Math.abs(time - anchor) <= WINDOW_MS;
    })
    .sort(
      (left, right) =>
        Date.parse(String(left.source['@timestamp'])) -
        Date.parse(String(right.source['@timestamp']))
    );
};

const branchCounts = (world: FpTpWorld): number[] =>
  world.alerts.map((_, index) => eventsInWindow(world, index).length);

const rawEventText = (id: string): string =>
  JSON.stringify(buildFpTpExampleWorld(id, 'run1').events.map(({ source }) => source));

describe('mimicrat-clickfix examples', () => {
  it.each(MIMICRAT_EXAMPLES.filter(({ checks }) => checks).map(({ id, checks }) => [id, checks]))(
    'returns the declared checks for %s from its seeded world',
    (id, checks) => {
      expect(observedChecks(buildFpTpExampleWorld(id as string, 'run1'))).toEqual(checks);
    }
  );

  it.each(['mimicrat-clickfix.drop-one-redundant', 'mimicrat-clickfix.drop-one-sole-evidence'])(
    'returns %s with one raw event fewer than tp',
    (id) => {
      expect(buildFpTpExampleWorld(id, 'run1').events).toHaveLength(
        buildFpTpExampleWorld('mimicrat-clickfix.tp', 'run1').events.length - 1
      );
    }
  );

  it('returns tp-host-name-only with alerts that have no host.id but keep their raw events findable by host.name', () => {
    const base = buildFpTpExampleWorld('mimicrat-clickfix.tp', 'run1');
    const world = buildFpTpExampleWorld('mimicrat-clickfix.tp-host-name-only', 'run1');
    expect(world.alerts.length).toBeGreaterThan(0);
    for (const alert of world.alerts) {
      const host = alert.source.host as Record<string, unknown>;
      expect(host.id).toBeUndefined();
      expect(typeof host.name).toBe('string');
    }
    expect(world.events).toEqual(base.events);
  });

  it('returns tp-multiday-span with cited-alert original_time spread over three days and every raw event retimed into its own stage\'s alert window', () => {
    const world = buildFpTpExampleWorld('mimicrat-clickfix.tp-multiday-span', 'run1');
    const originalTimes = world.alerts.map((alert) =>
      Date.parse(String(alert.source['kibana.alert.original_time']))
    );
    const spanDays = (Math.max(...originalTimes) - Math.min(...originalTimes)) / 86_400_000;
    expect(spanDays).toBeCloseTo(3, 5);
    const eventTimes = world.events.map((event) => Date.parse(String(event.source['@timestamp'])));
    // The events span the days with their stages, not the chain hour.
    expect(Math.max(...eventTimes) - Math.min(...eventTimes)).toBeGreaterThan(2 * 86_400_000);
    // Per-alert geometry: every cited event sits inside its citing alert's ±2h
    // branch window, so no branch after the first is empty.
    expect(branchCounts(world)).toEqual([2, 1, 2, 2]);
  });

  it('returns every alert still anchored after its cited events for tp-multiday-span', () => {
    const world = buildFpTpExampleWorld('mimicrat-clickfix.tp-multiday-span', 'run1');
    const eventTime = new Map(
      world.events.map((event) => [event.id, Date.parse(String(event.source['@timestamp']))])
    );
    for (const alert of world.alerts) {
      const ancestors = alert.source['kibana.alert.ancestors'] as Array<{ id: string }>;
      const cited = Math.max(
        ...ancestors.map(({ id }) => eventTime.get(id) ?? Number.NEGATIVE_INFINITY)
      );
      expect(Date.parse(String(alert.source['kibana.alert.original_time']))).toBeGreaterThanOrEqual(
        cited
      );
    }
  });

  // The dilution arithmetic the truncation example's gold stands on, now that the
  // fixture retimes each stage's events with its alert: under the workflow's
  // per-alert branches (10 each, oldest first) across the 3-day span, every branch
  // holds its own stage's events (1, 2, 2 like `tp-multiday-span`), but the FIRST
  // branch also holds the whole 60-event benign fill (it sits minutes after the
  // first stage's events, inside that alert's ±2h window and no other's). That
  // branch's own total is 62 > 10, so `branches_truncated` flips — corpus volume
  // inside a branch window dilutes that branch, exactly what the per-alert design
  // was supposed to survive, and the gold stays `inconclusive`.
  it('returns fp-multiday-span-truncated whose only over-cap branch is the first stage\'s, from the benign fill inside its own window', () => {
    const world = buildFpTpExampleWorld('mimicrat-clickfix.fp-multiday-span-truncated', 'run1');
    const isBenign = ({ source }: { source: Record<string, unknown> }): boolean =>
      (source.process as { name?: string } | undefined)?.name === 'svchost.exe';
    const totals = branchCounts(world);
    // Fill (60) + the first stage's own 2 events; every later branch is clean.
    expect(totals).toEqual([62, 1, 2, 2]);
    const firstWindow = eventsInWindow(world, 0);
    expect(firstWindow.filter(isBenign)).toHaveLength(60);
    // The first stage's deciding events still lead its branch's oldest-first page.
    const page = firstWindow.slice(0, FP_TP_RAW_EVENT_PAGE_SIZE);
    expect(page.filter((event) => !isBenign(event))).toHaveLength(2);
  });

  it.each([
    ['mimicrat-clickfix.fp-benign-mimic', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-benign-mimic', 'amsiInitFailed'],
    ['mimicrat-clickfix.fp-benign-mimic', 'ProgramData'],
    ['mimicrat-clickfix.fp-entities-missing', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-network-only', MIMICRAT_STAGE2_DOMAIN],
    ['mimicrat-clickfix.fp-network-only', 'amsiInitFailed'],
    ['mimicrat-clickfix.fp-network-only', 'ProgramData'],
    ['mimicrat-clickfix.domain-swap', MIMICRAT_STAGE2_DOMAIN],
  ])('returns %s raw events without %s', (id, needle) => {
    expect(rawEventText(id).toLowerCase()).not.toContain(needle.toLowerCase());
  });
});
