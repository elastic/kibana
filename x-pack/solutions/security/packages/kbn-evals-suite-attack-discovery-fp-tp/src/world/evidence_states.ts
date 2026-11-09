/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ad2SeedId,
  type Ad2IndexedRawEvent,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import { FP_TP_RAW_EVENT_PAGE_SIZE } from './constants';
import { asRecord, withFieldMessage } from './event_message';
import type { FpTpWorld } from './types';

/** Benign events `withTruncatingBenignEvents` adds: more than one page on their own. */
export const FP_TP_TRUNCATING_BENIGN_EVENT_COUNT = FP_TP_RAW_EVENT_PAGE_SIZE + 10;

const BENIGN_EVENT_SPACING_MS = 2_000;

const BENIGN_SERVICES = ['Schedule', 'BITS', 'wuauserv', 'Dnscache', 'EventLog'] as const;

const SERVICES_PARENT = {
  name: 'services.exe',
  pid: 712,
  executable: 'C:\\Windows\\System32\\services.exe',
};

const hasProcessCategory = ({ source }: Ad2IndexedRawEvent): boolean => {
  const { category } = asRecord(source.event);
  return Array.isArray(category) && category.includes('process');
};

const timestampOf = ({ source }: Ad2IndexedRawEvent): number =>
  Date.parse(String(source['@timestamp']));

/** The entity store has nothing for the cited hosts and users. */
export const withoutEntities = (world: FpTpWorld): FpTpWorld => ({ ...world, entities: [] });

/** No raw events exist around the attack. */
export const withoutEvents = (world: FpTpWorld): FpTpWorld => ({ ...world, events: [] });

/** Keeps `world`'s alerts and events but takes the entity store from `other`. */
export const withEntitiesFrom = (world: FpTpWorld, other: FpTpWorld): FpTpWorld => ({
  ...world,
  entities: other.entities,
});

/** The workflow is run against an Attack Discovery id that names nothing. */
export const withoutAttackDiscovery = (world: FpTpWorld): FpTpWorld => ({
  ...world,
  attack: undefined,
});

/** The discovery cites an alert that is not seeded. */
export const withMissingCitedAlert = (world: FpTpWorld): FpTpWorld => ({
  ...world,
  alerts: world.alerts.slice(0, -1),
});

/**
 * Adds `count` benign service starts on the host of the latest process event, after
 * every raw event in the world. The analysis reads one page of raw events sorted
 * oldest first, so the world's own events stay on that page, and the extra hits mark
 * it truncated, which blocks a `false_positive` verdict. Throws when the world has no
 * process event to place them on.
 */
export const withTruncatingBenignEvents = (
  world: FpTpWorld,
  runMarker: string,
  count: number = FP_TP_TRUNCATING_BENIGN_EVENT_COUNT
): FpTpWorld => {
  const template = [...world.events]
    .filter(hasProcessCategory)
    .sort((left, right) => timestampOf(right) - timestampOf(left))[0];
  if (template === undefined) {
    throw new Error('withTruncatingBenignEvents: the world has no process event to extend');
  }
  const after = Math.max(...world.events.map(timestampOf));

  const benign = Array.from({ length: count }, (_, position): Ad2IndexedRawEvent => {
    const id = ad2SeedId(runMarker, 'process', 'benign-service', position);
    const service = BENIGN_SERVICES[position % BENIGN_SERVICES.length];
    const commandLine = `C:\\Windows\\system32\\svchost.exe -k netsvcs -p -s ${service}`;
    const args = commandLine.split(/\s+/).filter(Boolean);
    return withFieldMessage({
      index: template.index,
      id,
      source: {
        ...template.source,
        '@timestamp': new Date(after + (position + 1) * BENIGN_EVENT_SPACING_MS).toISOString(),
        event: { ...asRecord(template.source.event), id },
        process: {
          name: 'svchost.exe',
          pid: 6000 + position,
          entity_id: ad2SeedId(runMarker, 'entity', 'benign-service', position),
          executable: 'C:\\Windows\\System32\\svchost.exe',
          command_line: commandLine,
          args,
          args_count: args.length,
          parent: SERVICES_PARENT,
        },
      },
    });
  });

  return { ...world, events: [...world.events, ...benign] };
};
