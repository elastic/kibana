/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { DocumentDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';

export const RULE_NAME_FIELD = 'kibana.alert.rule.name';

/** Producers build the payload from a fields map, so values arrive as arrays. */
export const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

/** The fields of a `security.alert` payload, or `null` when it is prose rather than JSON. */
export const parseAlertPayload = (
  attachment: UnknownAttachment
): Record<string, unknown> | null => {
  const alert = (attachment.data as { alert?: unknown })?.alert;
  if (typeof alert !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(alert);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

export const toDocumentDescriptor = (
  payload: Record<string, unknown>
): DocumentDescriptor | null => {
  const documentId = firstString(payload._id);
  const indexName = firstString(payload._index);

  return documentId && indexName
    ? { kind: FLYOUT_DESCRIPTOR_KIND.document, documentId, indexName }
    : null;
};

export const toAlertDescriptor = (attachment: UnknownAttachment): DocumentDescriptor | null => {
  const payload = parseAlertPayload(attachment);
  return payload ? toDocumentDescriptor(payload) : null;
};
