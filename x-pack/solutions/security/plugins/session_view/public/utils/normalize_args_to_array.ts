/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalizes process arguments to always return a string array.
 * Handles cases where args can be undefined, a single string, or already an array.
 *
 * @param args - Process arguments that can be undefined, string, or string array
 * @returns Always returns a string array (empty if args is undefined)
 */
export const normalizeArgsToArray = (args: string | string[] | undefined): string[] => {
  if (!args) return [];

  return Array.isArray(args) ? args : [args];
};
