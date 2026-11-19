/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitorErrorEvent } from './types';

export const ERROR_THROTTLE_MS = 60 * 60 * 1000;
export const MAX_THROTTLE_KEYS = 100;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Expected states and Elasticsearch/infrastructure faults: not Synthetics bugs.
const NOISE_MESSAGE_PATTERNS = [
  /license is expired/i,
  /search_phase_execution_exception/i,
  /missing shards/i,
  /TOO_MANY_REQUESTS/,
  /disk usage exceeded flood-stage/i,
  /TLS handshake timeout/i,
];

const isLoopbackUrl = (url?: string): boolean => {
  if (!url) {
    return false;
  }
  try {
    return LOOPBACK_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

export const isNoisyError = ({
  url,
  message,
}: Pick<MonitorErrorEvent, 'url' | 'message'>): boolean =>
  isLoopbackUrl(url) || NOISE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message ?? ''));

/** Digits are masked so "ran 15 minutes ago" and "ran 19 minutes ago" share a key. */
export const getErrorThrottleKey = ({
  type,
  message,
}: Pick<MonitorErrorEvent, 'type' | 'message'>): string =>
  `${type}:${(message ?? '').replace(/\d+/g, '#').slice(0, 200)}`;
