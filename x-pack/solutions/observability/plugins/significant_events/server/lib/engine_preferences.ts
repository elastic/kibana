/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SEVERITY_OPTIONS,
  type SignificantEvent,
  type Severity,
} from '@kbn/significant-events-schema';
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers, type SavedObjectsType } from '@kbn/core/server';
import type { SignificantEventsServer } from '../types';

const TYPE = 'significant-events-engine-preferences';
export interface EnginePreferences {
  severityFeedback?: Record<string, { severity: Severity; reason: string; updatedAt: string }>;
  confidenceThreshold: number;
  discoveryPaused: boolean;
  dailyDiscoveryLimit: number;
  pausedStreams: string[];
  usage: Record<string, number>;
  history: Array<{ timestamp: string; actor: string; message: string }>;
}
export const enginePreferencesSavedObjectType: SavedObjectsType = {
  name: TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: { dynamic: false, properties: {} },
  management: { importableAndExportable: false },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          severityFeedback: schema.maybe(
            schema.recordOf(
              schema.string({ maxLength: 20000 }),
              schema.object({
                severity: schema.oneOf([
                  schema.literal('critical'),
                  schema.literal('high'),
                  schema.literal('medium'),
                  schema.literal('low'),
                ]),
                reason: schema.string({ maxLength: 1000 }),
                updatedAt: schema.string({ maxLength: 64 }),
              })
            )
          ),
          confidenceThreshold: schema.number({ min: 0, max: 1 }),
          discoveryPaused: schema.boolean(),
          dailyDiscoveryLimit: schema.number({ min: 0, max: 10000 }),
          pausedStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 10000 }),
          usage: schema.recordOf(schema.string({ maxLength: 10 }), schema.number({ min: 0 })),
          history: schema.arrayOf(
            schema.object({
              timestamp: schema.string(),
              actor: schema.string(),
              message: schema.string(),
            }),
            { maxSize: 200 }
          ),
        }),
      },
    },
  },
};
const defaults = (): EnginePreferences => ({
  confidenceThreshold: 0,
  discoveryPaused: false,
  dailyDiscoveryLimit: 0,
  pausedStreams: [],
  usage: {},
  history: [],
});
const repository = (server: SignificantEventsServer) =>
  server.core.savedObjects.createInternalRepository([TYPE]);
const normalizePreferences = (preferences: EnginePreferences): EnginePreferences => ({
  ...preferences,
  severityFeedback: Object.fromEntries(
    Object.entries(preferences.severityFeedback ?? {}).flatMap(([key, feedback]) => {
      const severity = SEVERITY_OPTIONS.find(
        (value) => value === feedback.severity.split('-').at(-1)
      );
      return severity ? [[key, { ...feedback, severity }]] : [];
    })
  ),
});
export const readEnginePreferences = async (
  server: SignificantEventsServer,
  spaceId: string
): Promise<EnginePreferences> => {
  try {
    return normalizePreferences(
      (await repository(server).get<EnginePreferences>(TYPE, spaceId)).attributes
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) return defaults();
    throw error;
  }
};

export const mutateEnginePreferences = async (
  server: SignificantEventsServer,
  spaceId: string,
  change: (current: EnginePreferences) => EnginePreferences
): Promise<EnginePreferences> => {
  const client = repository(server);
  for (let attempt = 0; attempt < 20; attempt++) {
    let current: { attributes: EnginePreferences; version?: string } | undefined;
    try {
      current = await client.get<EnginePreferences>(TYPE, spaceId);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) throw error;
    }
    const next = change(normalizePreferences(current?.attributes ?? defaults()));
    try {
      if (current)
        await client.update<EnginePreferences>(TYPE, spaceId, next, { version: current.version });
      else await client.create(TYPE, next, { id: spaceId, overwrite: false });
      return next;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) throw error;
    }
  }
  throw new Error('Detection settings changed concurrently. Try again.');
};

export const consumeDiscoveryBudget = async (
  server: SignificantEventsServer,
  spaceId: string
): Promise<{ allowed: boolean; day: string }> => {
  const day = new Date().toISOString().slice(0, 10);
  let allowed = false;
  await mutateEnginePreferences(server, spaceId, (current) => {
    const count = current.usage[day] ?? 0;
    allowed =
      !current.discoveryPaused &&
      (current.dailyDiscoveryLimit === 0 || count < current.dailyDiscoveryLimit);
    if (!allowed) return current;
    const usage = Object.fromEntries(
      Object.entries({ ...current.usage, [day]: count + 1 })
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 90)
    );
    return { ...current, usage };
  });
  return { allowed, day };
};

/** Stable evidence scope for feedback shared by future occurrences of the same rule set. */
export const severityFeedbackKey = (
  event: Pick<SignificantEvent, 'signals' | 'stream_names'>
): string | undefined => {
  const confirmed = event.signals?.filter((signal) => signal.verdict === 'confirms') ?? [];
  const signals = confirmed.length ? confirmed : event.signals ?? [];
  const rules = [...new Set(signals.map((signal) => signal.metadata.rule_uuid))].sort();
  return rules.length
    ? JSON.stringify([[...new Set(event.stream_names)].sort(), rules])
    : undefined;
};

export const releaseDiscoveryBudget = async (
  server: SignificantEventsServer,
  spaceId: string,
  day: string
): Promise<void> => {
  await mutateEnginePreferences(server, spaceId, (current) => ({
    ...current,
    usage: { ...current.usage, [day]: Math.max(0, (current.usage[day] ?? 0) - 1) },
  }));
};
