/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineConfig, EngineEvent } from '../../../common';
import type { DocVersion } from '../domain';
import { getErrorMessage } from '../errors';
import { publishToAlertingV2 } from '../pipeline/publish';
import type { IEngineScope } from './engine_scope';
import type { IEventWorkingSet } from './event_working_set';
import type { IRunRecorder } from './run_recorder';

/** Earlier failed publications retried per run, oldest first. */
const MAX_REPUBLISH_PER_RUN = 50;

/**
 * Writes the run's events, then hands the changed ones off as Alerting v2 alerts. Returns the
 * events another writer changed first, whose changes from this run were not applied.
 *
 * Events are written first, marked as waiting for publication, so a crash between the two
 * steps leaves the event to be published by the next run instead of lost. An event another
 * writer (an operator) changed since it was read is not overwritten: its change from this run
 * is dropped and the next run starts from the operator's version.
 */
export async function persistAndPublish({
  scope,
  config,
  events,
  recorder,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  events: IEventWorkingSet;
  recorder: IRunRecorder;
}): Promise<Set<string>> {
  const { storage } = scope;
  const publish = config.publish_to_alerting_v2;
  const dirty = events.dirty().map((item) => ({
    ...item,
    event:
      publish && item.change === 'changed'
        ? {
            ...item.event,
            published: {
              ...item.event.published,
              at: new Date().toISOString(),
              ok: false,
              pending: true,
            },
          }
        : item.event,
  }));

  const results = await storage.events.write(
    dirty.map(({ event, version }) => ({ event, version }))
  );
  const written = new Map<string, { event: EngineEvent; version: DocVersion }>();
  const conflicted = new Set<string>();
  results.forEach((result, position) => {
    const { event } = dirty[position];
    if (result.ok) {
      written.set(event.event_id, { event, version: result.version });
      events.setVersion(event.event_id, result.version);
      return;
    }
    if (result.conflict) {
      conflicted.add(event.event_id);
      recorder.summary.conflicts += 1;
      events.drop(event.event_id);
      recorder.log({
        step: 'state',
        action: 'conflict',
        event_id: event.event_id,
        message: `"${event.title}" changed while the run was working on it; the run's change is dropped and the next run starts from the new version.`,
      });
      return;
    }
    recorder.log({
      step: 'state',
      action: 'write_failed',
      event_id: event.event_id,
      message: `Writing "${event.title}" failed: ${result.error}`,
    });
  });

  if (!publish) {
    return conflicted;
  }
  const retries = (await storage.events.findPendingPublication(MAX_REPUBLISH_PER_RUN)).filter(
    ({ event }) => !written.has(event.event_id)
  );
  const toPublish = [
    ...[...written.values()].filter(({ event }) => event.published?.pending),
    ...retries,
  ];
  if (toPublish.length === 0) {
    return conflicted;
  }

  const ruleEventsClient = await scope.getRuleEventsClient();
  const outcomes = await Promise.all(
    toPublish.map(async ({ event, version }) => {
      try {
        await publishToAlertingV2({ ruleEventsClient, event });
        recorder.log({
          step: 'publish',
          action: 'published',
          event_id: event.event_id,
          message: `Published "${event.title}" (${event.status}) to .rule-events as an Alerting v2 alert.`,
        });
        return {
          event: { ...event, published: { at: new Date().toISOString(), ok: true } },
          version,
        };
      } catch (error) {
        recorder.log({
          step: 'publish',
          action: 'failed',
          event_id: event.event_id,
          message: `Publishing "${event.title}" failed; retried on the next run: ${getErrorMessage(
            error
          )}`,
        });
        return {
          event: {
            ...event,
            published: {
              at: new Date().toISOString(),
              ok: false,
              pending: true,
              error: getErrorMessage(error),
            },
          },
          version,
        };
      }
    })
  );
  // A conflict here only means an operator acted since; their write published again anyway.
  await storage.events.write(outcomes);
  return conflicted;
}
