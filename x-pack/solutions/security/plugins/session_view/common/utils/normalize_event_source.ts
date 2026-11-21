/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessEvent, ProcessSelf } from '../types/v1';
import { expandDottedObject } from './expand_dotted_object';
import { normalizeProcessArgsInPlace } from './process_args_normalizer';

type ProcessPrevious = NonNullable<ProcessSelf['previous']>[number];

interface RawProcessPrevious {
  args?: string | string[];
  args_count?: number;
  executable?: string | string[];
}

const toArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

const hasDottedKeys = (source: object): boolean =>
  Object.keys(source).some((key) => key.includes('.'));

/**
 * `process.previous` can arrive as an array of objects, a single object (one entry in a
 * `nested` field of a columnar index), or an object of parallel arrays (a non-nested object
 * array flattened by a columnar index). In the last case args can no longer be paired with
 * their executable, so only the executables are kept.
 */
const normalizeProcessPrevious = (
  previous: RawProcessPrevious | Array<RawProcessPrevious | null>
): ProcessPrevious[] => {
  if (!Array.isArray(previous) && Array.isArray(previous.executable)) {
    return previous.executable.map((executable) => ({ executable }));
  }

  // a stored _source can contain null entries; skip them rather than fail the whole page.
  return toArray(previous)
    .filter((entry): entry is RawProcessPrevious => entry !== null && typeof entry === 'object')
    .map(({ args, ...rest }) => ({
      ...(rest as ProcessPrevious),
      ...(args !== undefined && args !== null ? { args: toArray(args) } : {}),
    }));
};

/**
 * Coerces, in place, the fields Session View reads as arrays. Indices with columnar `_source`
 * return single-element arrays as plain values.
 */
const coerceArrayFieldsInPlace = (source: ProcessEvent): void => {
  const { event, host, process, orchestrator, kibana } = source;

  if (event) {
    if (event.action !== undefined) event.action = toArray(event.action);
    if (event.category !== undefined) event.category = toArray(event.category);
    if (event.type !== undefined) event.type = toArray(event.type);
  }

  if (host) {
    if (host.ip !== undefined) host.ip = toArray(host.ip);
    if (host.mac !== undefined) host.mac = toArray(host.mac);
  }

  if (process?.previous !== undefined && process.previous !== null) {
    process.previous = normalizeProcessPrevious(
      process.previous as RawProcessPrevious | Array<RawProcessPrevious | null>
    ) as ProcessSelf['previous'];
  }

  const resource = orchestrator?.resource;
  if (resource) {
    if (resource.labels !== undefined) resource.labels = toArray(resource.labels);
    if (resource.annotations !== undefined) resource.annotations = toArray(resource.annotations);
  }

  const originalEvent = kibana?.alert?.original_event;
  if (originalEvent?.action !== undefined) {
    originalEvent.action = toArray(originalEvent.action);
  }
};

/**
 * Normalizes a Session View `_source` into nested JSON with array-typed fields, whether it came
 * from a stored (nested) or columnar (flat, dotted keys) `_source`. Does not mutate the input.
 */
export function normalizeEventSource(eventSource: object): ProcessEvent;
export function normalizeEventSource(eventSource: object | undefined): ProcessEvent | undefined;
export function normalizeEventSource(eventSource: object | undefined): ProcessEvent | undefined {
  if (!eventSource) return undefined;

  const cloned = structuredClone(eventSource);
  const source = (hasDottedKeys(cloned) ? expandDottedObject(cloned) : cloned) as ProcessEvent;

  coerceArrayFieldsInPlace(source);

  if (source.process) {
    normalizeProcessArgsInPlace(source.process);
  }

  return source;
}
