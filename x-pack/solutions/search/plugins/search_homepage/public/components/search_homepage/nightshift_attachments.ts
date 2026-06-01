/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { IconType } from '@elastic/eui';

/* ----------------------------------------------------------------------- *
 * Module-singleton stream of attachments staged on the Search homepage
 * input. Mirrors the obs Nightshift `nightshift_attachments$` pattern:
 *
 *  - Each staged attachment carries both the *pill* metadata
 *    (`label` + `iconType` for the UI above the editor) and an Agent
 *    Builder *payload* (`type` + `data`). On submit the input forwards
 *    the payloads to the hand-off so Agent Builder's
 *    `RoutedConversationsProvider` can pre-stage them on the new
 *    conversation round.
 *
 *  - `BehaviorSubject` (rather than a plain `Subject`) so consumers
 *    see the current value on subscribe without replay machinery.
 *
 * The Critical / Morning page in obs decides which attachments to send
 * via a `briefMode` arg; here we link the pills to the payload directly
 * — the user adds a pill via the per-row paperclip, the input drains
 * them on submit. That keeps the surface area of the hand-off small
 * (`onSubmit(prompt, payloads)`) and avoids a parallel registry.
 * ----------------------------------------------------------------------- */

/**
 * Slim "Agent Builder attachment" shape — the subset of fields needed
 * to populate `initialAttachments` on the new-conversation navigation
 * state. The concrete `T` is the attachment data type registered with
 * `agent_builder.attachments.addAttachmentType(...)`.
 */
export interface NightshiftAttachmentPayload<T = unknown> {
  /** Stable, unique id; used as the attachment id by Agent Builder. */
  id: string;
  /** Registered attachment type identifier (e.g. `nightshift.apiKey`). */
  type: string;
  /** Type-specific data record, matching the registered definition. */
  data: T;
}

/**
 * A staged attachment on the Search homepage input. Composed of:
 *  - the visual pill data (`label`, `iconType`), and
 *  - the agent-builder payload that will be forwarded on submit.
 */
export interface NightshiftAttachment {
  /** Stable id, used for de-duplication and keyed list rendering. */
  id: string;
  /** Pill label rendered above the editor. */
  label: string;
  /** Pill icon. Defaults to `document` if omitted. */
  iconType?: IconType;
  /** Agent Builder payload forwarded as `initialAttachments` on submit. */
  payload: NightshiftAttachmentPayload;
}

export const nightshiftAttachments$ = new BehaviorSubject<NightshiftAttachment[]>([]);

/**
 * Stage an attachment on the input. Idempotent on `id` — adding an
 * attachment whose id is already staged is a no-op so the paperclip
 * can be clicked repeatedly without producing duplicates.
 */
export function addNightshiftAttachment(attachment: NightshiftAttachment): void {
  const current = nightshiftAttachments$.getValue();
  if (current.some((a) => a.id === attachment.id)) {
    return;
  }
  nightshiftAttachments$.next([...current, attachment]);
}

/** Remove an attachment by id. No-op if the id is not currently staged. */
export function removeNightshiftAttachment(id: string): void {
  const current = nightshiftAttachments$.getValue();
  const next = current.filter((a) => a.id !== id);
  if (next.length === current.length) {
    return;
  }
  nightshiftAttachments$.next(next);
}

/** Clear every staged attachment. Called by the input after submit. */
export function clearNightshiftAttachments(): void {
  if (nightshiftAttachments$.getValue().length === 0) {
    return;
  }
  nightshiftAttachments$.next([]);
}
