/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Audit logger for detection emulation actions.
 *
 * This module wraps the existing response_actions audit trail with emulation-specific
 * context. It injects a structured reason field ('emulation:<emulationId>') into action
 * requests, enabling filtering and tracking of emulation actions in the audit trail.
 *
 * Key responsibilities:
 * - Format emulation context for audit trail (reason field injection)
 * - Provide consistent comment/reason format across all emulation actions
 * - Enable audit queries filtered by emulation ID
 */

/**
 * Builds a standardized comment string for emulation actions.
 * This comment appears in the response_actions audit trail and provides
 * human-readable context about the emulation command.
 *
 * @param emulationId - The unique identifier for the emulation run
 * @param command - The command being executed (e.g., 'execute', 'kill-process')
 * @param userComment - Optional additional comment from the user
 * @returns Formatted comment string for audit trail
 */
export function buildEmulationComment(
  emulationId: string,
  command: string,
  userComment?: string
): string {
  const baseComment = `Detection Emulation [${emulationId}]: ${command}`;
  return userComment ? `${baseComment} - ${userComment}` : baseComment;
}

/**
 * Builds a structured reason identifier for emulation actions.
 * This reason field is used for filtering response actions by emulation ID
 * in the audit trail and can be parsed to extract the emulation ID.
 *
 * Format: 'emulation:<emulationId>'
 *
 * @param emulationId - The unique identifier for the emulation run
 * @returns Structured reason string
 */
export function buildEmulationReason(emulationId: string): string {
  return `emulation:${emulationId}`;
}

/**
 * Extracts the emulation ID from a reason string.
 * Used for parsing audit trail entries to identify emulation actions.
 *
 * @param reason - The reason string from an action request (e.g., 'emulation:abc-123')
 * @returns The emulation ID if the reason is valid, undefined otherwise
 */
export function parseEmulationReason(reason: string): string | undefined {
  const match = reason.match(/^emulation:(.+)$/);
  return match?.[1];
}

/**
 * Checks if a reason string indicates an emulation action.
 *
 * @param reason - The reason string to check
 * @returns True if the reason indicates an emulation action
 */
export function isEmulationReason(reason: string): boolean {
  return reason.startsWith('emulation:');
}

/**
 * Enriches action request parameters with emulation audit context.
 * This function adds the structured reason and comment fields that enable
 * emulation actions to be tracked in the response_actions audit trail.
 *
 * @param emulationId - The unique identifier for the emulation run
 * @param command - The command being executed
 * @param parameters - The original action parameters (may include user comment)
 * @returns Enriched parameters with audit context
 */
export function enrichWithEmulationContext<T extends Record<string, unknown>>(
  emulationId: string,
  command: string,
  parameters?: T
): T & { comment: string; reason: string } {
  const userComment = parameters?.comment as string | undefined;

  return {
    ...parameters,
    comment: buildEmulationComment(emulationId, command, userComment),
    reason: buildEmulationReason(emulationId),
  } as T & { comment: string; reason: string };
}
