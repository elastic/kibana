/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ad2IndexedRawEvent } from '@kbn/evals-suite-attack-discovery-agent-builder';
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
export const withoutEventIds = (world: FpTpWorld, eventIds: readonly string[]): FpTpWorld => ({
  ...world,
  events: world.events.filter(({ id }) => !eventIds.includes(id)),
});

/** Drops every raw event whose `event.category` includes `category`. */
export const withoutEventCategory = (world: FpTpWorld, category: string): FpTpWorld => ({
  ...world,
  events: world.events.filter((event) => {
    const categories = asRecord(event.source.event).category;
    return !(Array.isArray(categories) && categories.includes(category));
  }),
});
