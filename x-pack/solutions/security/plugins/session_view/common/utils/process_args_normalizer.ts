/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessEvent, ProcessSelf } from '../types/v1';

/**
 * Normalizes `args` to always be a string array.
 * Handles cases where `args` can be undefined, a single string, or already an array.
 *
 * @param args - Process arguments that can be undefined, string, or string array
 * @returns Always returns a string array (empty if args is undefined)
 */
const normalizeArray = (args: string | string[] | undefined) => {
  if (!args) return [];
  return Array.isArray(args) ? args : [args];
};

/**
 * Type representing nested process field keys that contain ProcessFields with args
 */
type NestedProcessFieldKey = keyof Pick<
  ProcessSelf,
  'parent' | 'session_leader' | 'entry_leader' | 'group_leader'
>;

/**
 * Normalizes the args field in a ProcessSelf object to ensure consistent array structure
 */
const normalizeArgsField = (process: ProcessSelf): void => {
  // Normalize main process args
  process.args = normalizeArray(process.args);

  // Normalize args in nested process objects
  const nestedFields: NestedProcessFieldKey[] = [
    'parent',
    'session_leader',
    'entry_leader',
    'group_leader',
  ];

  nestedFields.forEach((field) => {
    const nestedProcess = process[field];
    if (nestedProcess?.args) {
      nestedProcess.args = normalizeArray(nestedProcess.args);
    }
  });
};

/**
 * Normalizes the `args` field in ProcessEvent.process objects and nested objects to ensure consistent data structure.
 * This prevents frontend runtime errors when calling array methods on args.
 *
 * @param eventSource - The event._source object from Elasticsearch
 * @returns The event._source object with normalized args fields
 */
export const normalizeEventProcessArgs = (eventSource: ProcessEvent) => {
  // Handle different Elasticsearch response structures
  if (!eventSource || !eventSource.process) return eventSource;

  const clonedEvent = structuredClone(eventSource);
  normalizeArgsField(clonedEvent.process!);

  return clonedEvent;
};
