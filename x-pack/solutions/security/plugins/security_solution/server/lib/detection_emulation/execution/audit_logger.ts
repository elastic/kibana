/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Audit-trail comment helpers for detection emulation actions.
 *
 * The runner injects the result of `buildEmulationComment` into the
 * `comment` field of every Response Actions request. The comment lands
 * in the response_actions audit trail, which is how operators trace a
 * dispatched action back to the emulation that produced it.
 *
 * (The previous version of this module also exported `buildEmulationReason`,
 * `parseEmulationReason`, `isEmulationReason`, and `enrichWithEmulationContext`.
 * They were never called by any production code and have been removed.
 * Use `buildEmulationComment` for everything.)
 */

/**
 * Build a standardized comment string for an emulation-dispatched
 * Response Action. The format is intentionally stable so audit
 * consumers can grep for `Detection Emulation [<id>]:`.
 *
 * @param emulationId - unique identifier for the emulation run
 * @param command - the response-action command being dispatched
 * @param userComment - optional caller-supplied note to append
 */
export function buildEmulationComment(
  emulationId: string,
  command: string,
  userComment?: string
): string {
  const baseComment = `Detection Emulation [${emulationId}]: ${command}`;
  return userComment ? `${baseComment} - ${userComment}` : baseComment;
}
