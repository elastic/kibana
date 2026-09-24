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

const mapEvents = (
  world: FpTpWorld,
  matches: (event: Ad2IndexedRawEvent) => boolean,
  update: (event: Ad2IndexedRawEvent) => Ad2IndexedRawEvent
): FpTpWorld => ({
  ...world,
  events: world.events.map((event) => (matches(event) ? withFieldMessage(update(event)) : event)),
});

/** Rewrites the parent of every raw event whose process is `childName`. */
export const withProcessParent = (
  world: FpTpWorld,
  childName: string,
  parent: FpTpChainParentProcess
): FpTpWorld =>
  mapEvents(
    world,
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
    (event) => processName(event) === childName,
    (event) => {
      const { parent, ...process } = asRecord(event.source.process);
      return { ...event, source: { ...event.source, process } };
    }
  );

/** Rewrites the destination of every raw event that connects to `fromDomain`. */
export const withNetworkDestination = (
  world: FpTpWorld,
  fromDomain: string,
  destination: FpTpChainDestination
): FpTpWorld =>
  mapEvents(
    world,
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
