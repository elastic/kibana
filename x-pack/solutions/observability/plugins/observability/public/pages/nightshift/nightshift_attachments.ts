/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { IconType } from '@elastic/eui';

/**
 * Simplified attachment shape used by the Nightshift prototype. Mirrors
 * the shape (id + display label + icon) that Agent Builder's
 * `AttachmentPill` consumes, but without the full Agent Builder
 * attachment schema (versions, content hashes, attachment service UI
 * definitions, …) — those are deferred until Nightshift uses the real
 * agent runtime.
 */
export interface NightshiftAttachment {
  /** Stable id, used for de-duplication and keyed list rendering. */
  id: string;
  /** Display label rendered inside the pill (e.g. the event title). */
  label: string;
  /** EUI icon shown in the pill's left tile. Defaults to `document`. */
  iconType?: IconType;
}

/**
 * Module-singleton stream of attachments staged on the Nightshift input.
 *
 * The Critical page's per-row paperclip icon pushes to this subject; the
 * `NightshiftInput` subscribes and renders an `AttachmentPillsRow`-style
 * row above the editor (matching Agent Builder's UX). On submit the
 * input drains the list.
 *
 * BehaviorSubject is used (not a plain Subject) so consumers always see
 * the current set without needing to replay.
 */
export const nightshiftAttachments$ = new BehaviorSubject<NightshiftAttachment[]>([]);

/**
 * Stage an attachment on the Nightshift input. Idempotent: adding an
 * attachment whose `id` is already present is a no-op (prevents
 * double-attach when a user repeatedly clicks the paperclip).
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

/** Clear every staged attachment. Called by the input after a successful submit. */
export function clearNightshiftAttachments(): void {
  if (nightshiftAttachments$.getValue().length === 0) {
    return;
  }
  nightshiftAttachments$.next([]);
}
