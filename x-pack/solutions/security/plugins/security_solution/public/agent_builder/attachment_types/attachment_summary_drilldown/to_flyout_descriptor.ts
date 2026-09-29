/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';

/** Producers build the payload from a fields map, so values arrive as arrays. */
const firstValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

/**
 * Maps a `security.alert` attachment onto the document flyout it should open, or `null` when
 * the payload identifies nothing (read-only row).
 */
export const toAlertDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  const alert = (attachment.data as { alert?: unknown })?.alert;
  if (typeof alert !== 'string') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(alert);
  } catch {
    // The payload schema is a bare string, so prose and markdown are valid and unopenable.
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const { _id: id, _index: index } = parsed as Record<string, unknown>;
  const documentId = firstValue(id);
  const indexName = firstValue(index);

  return documentId && indexName
    ? { kind: FLYOUT_DESCRIPTOR_KIND.document, documentId, indexName }
    : null;
};

/**
 * Maps a `security.rule` attachment onto the rule flyout it should open, or `null` when
 * the payload identifies nothing (read-only row).
 *
 * Id resolution: `text.id` wins over `origin`.
 * - `text.id` is present for resolved attachments (investigate-rule skill, workflow updates).
 * - `origin` covers browser "Add to chat" producers that strip `id` from `text`.
 */
export const toRuleDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  const text = (attachment.data as { text?: unknown })?.text;

  let ruleId: string | undefined;

  if (typeof text === 'string') {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const id = (parsed as Record<string, unknown>).id;
        if (typeof id === 'string' && id) {
          ruleId = id;
        }
      }
    } catch {
      // text is prose or malformed JSON — not identifiable
    }
  }

  if (!ruleId) {
    const origin = attachment.origin;
    if (typeof origin === 'string' && origin) {
      ruleId = origin;
    }
  }

  return ruleId ? { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId } : null;
};
