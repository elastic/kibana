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

/**
 * `security.alert` stores the alert as a JSON string of picked fields. The producers build it
 * from a fields map, so values arrive as arrays, but a scalar is still an id.
 */
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
    // The schema for this payload is a bare string, so a producer writing prose or markdown is
    // valid — it just cannot be drilled into.
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
 * Maps an attachment shown in the investigation flyout's attachment summary onto the flyout it
 * should open. Returns `null` when the payload identifies nothing, which leaves the row read-only
 * rather than opening an empty flyout.
 *
 * Only `security.alert` is wired up so far. The remaining summary kinds — attack discovery, rule
 * and entity — each add a case here and a registration alongside their own attachment definition;
 * nothing else has to change, because opening goes through flyout_v2's own descriptor switch.
 */
export const toFlyoutDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  switch (attachment.type) {
    case SecurityAgentBuilderAttachments.alert:
      return toDocumentDescriptor(attachment);

    default:
      return null;
  }
};
