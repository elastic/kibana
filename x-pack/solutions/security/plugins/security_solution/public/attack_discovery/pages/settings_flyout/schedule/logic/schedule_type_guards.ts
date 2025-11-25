/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';
import { AttackDiscoverySchedule as AttackDiscoveryScheduleSchema } from '@kbn/elastic-assistant-common/impl/schemas/attack_discovery/routes/internal/schedules/schedules.gen';

/**
 * Type guard to check if a response is already in the internal AttackDiscoverySchedule format.
 * This is used when the internal API returns camelCase format data that doesn't need transformation.
 *
 * @param value - The value to check
 * @returns true if the value is a valid AttackDiscoverySchedule
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
 * Type guard to check if an array of responses are already in the internal AttackDiscoverySchedule format.
 * This is used when the internal API returns camelCase format data that doesn't need transformation.
 *
 * @param value - The array to check
 * @returns true if the array contains valid AttackDiscoverySchedule objects
 */
export function isAttackDiscoveryScheduleArray(value: unknown): value is AttackDiscoverySchedule[] {
  return Array.isArray(value) && value.every(isAttackDiscoverySchedule);
}

/**
 * Safely converts a response to AttackDiscoverySchedule format.
 * If the response is already in the correct format, it returns as-is.
 * If not, it throws an error to indicate the response needs transformation.
 *
 * @param value - The response to convert
 * @returns The value as AttackDiscoverySchedule if it's valid
 * @throws Error if the value is not a valid AttackDiscoverySchedule
 */
export function toAttackDiscoverySchedule(value: unknown): AttackDiscoverySchedule {
  if (isAttackDiscoverySchedule(value)) {
    return value;
  }
  throw new Error(
    'Response is not in internal AttackDiscoverySchedule format and needs transformation'
  );
}

/**
 * Safely converts an array response to AttackDiscoverySchedule[] format.
 * If the response is already in the correct format, it returns as-is.
 * If not, it throws an error to indicate the response needs transformation.
 *
 * @param value - The array response to convert
 * @returns The value as AttackDiscoverySchedule[] if it's valid
 * @throws Error if the value is not a valid AttackDiscoverySchedule array
 */
export function toAttackDiscoveryScheduleArray(value: unknown): AttackDiscoverySchedule[] {
  if (isAttackDiscoveryScheduleArray(value)) {
    return value;
  }
  throw new Error(
    'Response is not in internal AttackDiscoverySchedule[] format and needs transformation'
  );
}
