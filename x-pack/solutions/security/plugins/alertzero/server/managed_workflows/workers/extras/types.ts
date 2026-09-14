/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WorkerExtrasModule {
  createDefaults(): Record<string, unknown>;
  parse(raw: unknown): Record<string, unknown>;
  applyPatch(
    current: Record<string, unknown>,
    patch: Record<string, unknown>
  ): { extras: Record<string, unknown> } | { rejected: string };
}

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
