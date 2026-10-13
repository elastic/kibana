/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefSignal } from './types';

/** Declares a signal; register it in `signals/index.ts`. */
export const defineSignal = (signal: BriefSignal): BriefSignal => signal;

/** Thrown by a signal when its data source is not there (not set up, no index yet). */
export class SignalUnavailableError extends Error {}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Code-point string comparison, so ordering (and therefore fact ids) is locale-independent. */
export const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
