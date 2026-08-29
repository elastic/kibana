/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Upper bound mirrors the proposal-row `stagedActions` field (`@kbn/pnd-common`). */
const MAX_STAGED_ACTIONS_LENGTH = 32768;

/**
 * The reasoning-sections title `watch_floor.yaml`'s `reason_incident_contained` step gives
 * the staged containment actions it rendered with liquid's `| json`.
 *
 * ⚠️ A contract with that YAML, pinned on both sides with literals: `@kbn/workflows` is
 * `group: platform` and cannot import this plugin. `watch_floor.test.ts` pins the title on
 * the rendering side and this lib's test pins it here. Drift does not throw — it silently
 * drops the containment row back to the fixed decision form, where nothing executes.
 */
export const STAGED_ACTIONS_SECTION_TITLE = 'Staged containment actions';

interface ReasoningSectionLike {
  body?: unknown;
  title?: unknown;
}

/**
 * The staged containment actions JSON from a gate's predecessor `reasoning.sections`, or
 * `undefined` when there is none.
 *
 * The reasoning **summary** is truncated at 8192 characters by `extractReasoningSummary`,
 * which a staged-action array with full target lists can exceed on its own — the sections
 * are stored untruncated, so they are the channel that survives a long list. Fail-closed on
 * every irregularity (no sections, no matching title, a non-string body, a body that is not
 * a JSON array at first glance, or one past the row bound): the caller simply omits the
 * field and the queue's containment card degrades to the fixed decision form.
 *
 * Deliberately does not `JSON.parse` here: the row carries the string verbatim and the
 * client-side reader owns validation, so a projection bug cannot corrupt the contract —
 * only omit it.
 */
export const extractStagedActionsJson = (
  reasoning: Record<string, unknown> | undefined | null
): string | undefined => {
  if (reasoning == null) {
    return undefined;
  }

  const { sections } = reasoning;
  if (!Array.isArray(sections)) {
    return undefined;
  }

  const section = sections.find(
    (candidate: ReasoningSectionLike) =>
      typeof candidate === 'object' &&
      candidate != null &&
      candidate.title === STAGED_ACTIONS_SECTION_TITLE
  ) as ReasoningSectionLike | undefined;

  const body = section?.body;
  if (typeof body !== 'string') {
    return undefined;
  }

  const trimmed = body.trim();
  if (!trimmed.startsWith('[') || trimmed.length > MAX_STAGED_ACTIONS_LENGTH) {
    return undefined;
  }

  return trimmed;
};
