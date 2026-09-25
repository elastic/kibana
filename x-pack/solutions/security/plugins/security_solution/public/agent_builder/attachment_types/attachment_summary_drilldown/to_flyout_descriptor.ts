/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';

/** Producers build the payload from a fields map, so values arrive as arrays. */
const firstValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

const toDocumentDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
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
 * Maps a summary attachment onto the flyout it should open, or `null` when the payload
 * identifies nothing, which leaves the row read-only.
 *
 * Only `security.alert` so far; the other summary kinds each add a case and a registration.
 */
export const toFlyoutDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  switch (attachment.type) {
    case SecurityAgentBuilderAttachments.alert:
      return toDocumentDescriptor(attachment);

    default:
      return null;
  }
};
