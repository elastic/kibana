/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ad2SeedId,
  type Ad2IndexedAlert,
  type Ad2IndexedRawEvent,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import type { FpTpChainDestination, FpTpChainParentProcess } from './chain';
import { asRecord, withFieldMessage } from './event_message';
import type { FpTpWorld } from './types';

const processName = (event: Ad2IndexedRawEvent): unknown => asRecord(event.source.process).name;

/** Throws when nothing matches, so a rewrite whose target moved fails instead of changing nothing. */
const mapEvents = (
  world: FpTpWorld,
  target: string,
  matches: (event: Ad2IndexedRawEvent) => boolean,
  update: (event: Ad2IndexedRawEvent) => Ad2IndexedRawEvent
): FpTpWorld => {
  if (!world.events.some(matches)) {
    throw new Error(`No raw event matches ${target}`);
  }
  return {
    ...world,
    events: world.events.map((event) => (matches(event) ? withFieldMessage(update(event)) : event)),
  };
};

/** Rewrites the parent of every raw event whose process is `childName`. */
export const withProcessParent = (
  world: FpTpWorld,
  childName: string,
  parent: FpTpChainParentProcess
): FpTpWorld =>
  mapEvents(
    world,
    `process ${childName}`,
    (event) => processName(event) === childName,
    (event) => ({
      ...event,
      source: { ...event.source, process: { ...asRecord(event.source.process), parent } },
    })
  );

/** Removes the parent from every raw event whose process is `childName`, so there is none to judge. */
export const withoutProcessParent = (world: FpTpWorld, childName: string): FpTpWorld =>
  mapEvents(
    world,
    `process ${childName}`,
    (event) => processName(event) === childName,
    (event) => {
      const { parent, ...process } = asRecord(event.source.process);
      return { ...event, source: { ...event.source, process } };
    }
  );

/** Rewrites the command line of the raw event with id `eventId`. */
export const withCommandLine = (
  world: FpTpWorld,
  eventId: string,
  commandLine: string
): FpTpWorld => {
  const args = commandLine.split(/\s+/).filter(Boolean);
  return mapEvents(
    world,
    `id ${eventId}`,
    ({ id }) => id === eventId,
    (event) => ({
      ...event,
      source: {
        ...event.source,
        process: {
          ...asRecord(event.source.process),
          command_line: commandLine,
          args,
          args_count: args.length,
        },
      },
    })
  );
};

/** Rewrites the file path of the raw event with id `eventId`. */
export const withFilePath = (world: FpTpWorld, eventId: string, path: string): FpTpWorld =>
  mapEvents(
    world,
    `id ${eventId}`,
    ({ id }) => id === eventId,
    (event) => ({
      ...event,
      source: { ...event.source, file: { path, name: path.split('\\').pop() } },
    })
  );

/** Rewrites the executable of every raw event whose process is `name`. */
export const withProcessExecutable = (
  world: FpTpWorld,
  name: string,
  executable: string
): FpTpWorld =>
  mapEvents(
    world,
    `process ${name}`,
    (event) => processName(event) === name,
    (event) => ({
      ...event,
      source: {
        ...event.source,
        process: { ...asRecord(event.source.process), executable },
      },
    })
  );

/** Rewrites the destination of every raw event that connects to `fromDomain`. */
export const withNetworkDestination = (
  world: FpTpWorld,
  fromDomain: string,
  destination: FpTpChainDestination
): FpTpWorld =>
  mapEvents(
    world,
    `destination ${fromDomain}`,
    (event) => asRecord(event.source.destination).domain === fromDomain,
    (event) => ({ ...event, source: { ...event.source, destination } })
  );

/** Drops the raw events with the given ids. Alerts still cite them, as they would after data loss. */
export const withoutEventIds = (world: FpTpWorld, eventIds: readonly string[]): FpTpWorld => {
  const missing = eventIds.filter((eventId) => !world.events.some(({ id }) => id === eventId));
  if (missing.length > 0) {
    throw new Error(`No raw event matches id ${missing.join(', ')}`);
  }
  return { ...world, events: world.events.filter(({ id }) => !eventIds.includes(id)) };
};

const citedEventIds = (alert: Ad2IndexedAlert): string[] => {
  const ancestors = alert.source['kibana.alert.ancestors'];
  return Array.isArray(ancestors) ? ancestors.map((ancestor) => String(asRecord(ancestor).id)) : [];
};

/**
 * Gives the process of each alert, and of the raw events it cites, its own pid and
 * `process.entity_id`, parent pids included, so no process tree or entity id joins two
 * alerts. Host and user stay shared: identifiers without a bridge. A parent that ran in
 * another alert's events is left with no process event, as when that telemetry is
 * absent. Throws when a raw event is cited by no alert or by two, since either would
 * keep a bridge.
 */
export const withoutAlertBridges = (world: FpTpWorld): FpTpWorld => {
  const alertIndexOf = new Map<string, number>();
  world.alerts.forEach((alert, index) => {
    for (const eventId of citedEventIds(alert)) {
      if (alertIndexOf.has(eventId)) {
        throw new Error(`Raw event ${eventId} is cited by more than one alert`);
      }
      alertIndexOf.set(eventId, index);
    }
  });
  const alertIndexOfEvent = (eventId: string): number => {
    const index = alertIndexOf.get(eventId);
    if (index === undefined) {
      throw new Error(`No alert cites raw event ${eventId}`);
    }
    return index;
  };

  const pids = [
    ...world.alerts.map(({ source }) => asRecord(source.process)),
    ...world.events.map(({ source }) => asRecord(source.process)),
  ]
    .flatMap((process) => [Number(process.pid), Number(asRecord(process.parent).pid)])
    .filter(Number.isFinite);
  if (pids.length === 0) {
    throw new Error('No process in the world has a numeric pid');
  }
  // Each alert gets its own band above every pid, and its own shift inside the band, so
  // renumbered pids neither collide across alerts nor keep the original trailing digits.
  const stride = 10 ** String(Math.max(...pids)).length;
  const renumber = (pid: number, index: number): number =>
    stride * (index + 1) + ((pid + 7919 * (index + 1)) % stride);
  const separate = (value: unknown, index: number): Record<string, unknown> => {
    const process = asRecord(value);
    const pid = Number(process.pid);
    return {
      ...process,
      ...(Number.isFinite(pid) ? { pid: renumber(pid, index) } : {}),
      ...(process.entity_id !== undefined
        ? { entity_id: ad2SeedId(String(process.entity_id), 'entity', 'no-bridge', index) }
        : {}),
    };
  };
  const separateWithParent = (value: unknown, index: number): Record<string, unknown> => {
    const process = separate(value, index);
    return process.parent ? { ...process, parent: separate(process.parent, index) } : process;
  };

  return {
    ...world,
    alerts: world.alerts.map((alert, index) => ({
      ...alert,
      source: { ...alert.source, process: separateWithParent(alert.source.process, index) },
    })),
    events: world.events.map((event) => ({
      ...event,
      source: {
        ...event.source,
        process: separateWithParent(event.source.process, alertIndexOfEvent(event.id)),
      },
    })),
  };
};

/** Drops every raw event whose `event.category` includes `category`. */
export const withoutEventCategory = (world: FpTpWorld, category: string): FpTpWorld => ({
  ...world,
  events: world.events.filter((event) => {
    const categories = asRecord(event.source.event).category;
    return !(Array.isArray(categories) && categories.includes(category));
  }),
});
