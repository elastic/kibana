/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleMemCache } from '../../../../../../lib/simple_mem_cache';

// Shared cache instance for throttling Microsoft Defender Endpoint actions
// Using static cache because each actions creates a separate response actions client
const THROTTLE_CACHE = new SimpleMemCache({ ttl: 10 });

interface ActionThrottle {
  readonly isThrottled: boolean;

  setThrottle(): void;

  clearThrottle(): void;
}

/**
 * Creates a throttle controller for a specific Microsoft Defender Endpoint action
 * @param command - The action command type (e.g., 'runscript', 'isolate')
 * @param agentId - The agent ID
 * @param spaceId - The Kibana space ID for multi-tenant isolation
 * @returns An object with getter/setter for throttle control
 */
export function createActionThrottle(
  command: string,
  agentId: string,
  spaceId: string
): ActionThrottle {
  const throttleKey = `action_throttle:${spaceId}:${command}:${agentId}`;

  return {
    /**
     * Checks if the action is currently throttled (within 10-second cooldown)
     */
    get isThrottled(): boolean {
      const throttleEntry = THROTTLE_CACHE.get<boolean>(throttleKey);
      return throttleEntry === true;
    },

    /**
     * Sets a 10-second throttle for this action
     */
    setThrottle(): void {
      // Uses the default TTL set up at the top of this file
      THROTTLE_CACHE.set(throttleKey, true);
    },

    clearThrottle(): void {
      THROTTLE_CACHE.delete(throttleKey);
    },
  };
}

/**
 * Clears all throttle entries from the cache
 * Used primarily for testing to ensure clean state between test runs
 */
export function clearAllThrottles(): void {
  THROTTLE_CACHE.deleteAll();
}
