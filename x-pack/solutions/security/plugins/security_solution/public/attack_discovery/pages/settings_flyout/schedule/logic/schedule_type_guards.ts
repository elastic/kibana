/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';
import { AttackDiscoverySchedule as AttackDiscoveryScheduleSchema } from '@kbn/elastic-assistant-common/impl/schemas/attack_discovery/routes/public/schedules/schedules.gen';

/**
 * Type guard to check if a response is in the public API AttackDiscoveryApiSchedule format.
 * This is used to validate that API responses match the expected snake_case public API format.
 *
 * @param value - The value to check
 * @returns true if the value is a valid AttackDiscoveryApiSchedule
 */
export function isAttackDiscoverySchedule(value: unknown): value is AttackDiscoverySchedule {
  try {
    AttackDiscoveryScheduleSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if an array of responses are in the public API AttackDiscoveryApiSchedule format.
 * This is used to validate that API responses match the expected snake_case public API format.
 *
 * @param value - The array to check
 * @returns true if the array contains valid AttackDiscoveryApiSchedule objects
 */
export function isAttackDiscoveryScheduleArray(value: unknown): value is AttackDiscoverySchedule[] {
  return Array.isArray(value) && value.every(isAttackDiscoverySchedule);
}

/**
 * Safely converts a response to AttackDiscoveryApiSchedule format.
 * If the response is in the correct public API format, it returns as-is.
 * If not, it throws an error to indicate validation failure.
 *
 * @param value - The response to convert
 * @returns The value as AttackDiscoveryApiSchedule if it's valid
 * @throws Error if the value is not a valid AttackDiscoveryApiSchedule
 */
export function toAttackDiscoverySchedule(value: unknown): AttackDiscoverySchedule {
  if (isAttackDiscoverySchedule(value)) {
    return value;
  }
  throw new Error('Response is not in valid AttackDiscoveryApiSchedule format');
}

/**
 * Safely converts an array response to AttackDiscoveryApiSchedule[] format.
 * If the response is in the correct public API format, it returns as-is.
 * If not, it throws an error to indicate validation failure.
 *
 * @param value - The array response to convert
 * @returns The value as AttackDiscoveryApiSchedule[] if it's valid
 * @throws Error if the value is not a valid AttackDiscoveryApiSchedule array
 */
export function toAttackDiscoveryScheduleArray(value: unknown): AttackDiscoverySchedule[] {
  if (isAttackDiscoveryScheduleArray(value)) {
    return value;
  }
  throw new Error('Response is not in valid AttackDiscoveryApiSchedule[] format');
}
