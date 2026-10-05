/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';

// The rules API validates `id` as a UUID.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** Producers build the payload from a fields map, so values arrive as arrays. */
const firstValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

/**
 * Maps a `security.rule` attachment onto the rule flyout it should open, or `null` when the
 * rule has not been saved yet (create-intent only — read-only row).
 */
export const toRuleDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  // Prefer origin when it's already a UUID (set by ai_rule_creation_handler via saved.id).
  const origin = (attachment as { origin?: unknown }).origin;
  if (isUuid(origin)) {
    return { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId: origin };
  }

  // Workflow-created attachments set origin to rule_id (not the SO UUID). Fall back to the
  // `id` field embedded in data.text, which is always the internal UUID.
  try {
    const text = (attachment.data as { text?: unknown })?.text;
    if (typeof text === 'string') {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (isUuid(parsed.id)) {
        return { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId: parsed.id };
      }
    }
  } catch {
    // malformed JSON — treat as unsaveable
  }

  return null;
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
