/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpWorld } from './types';

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
