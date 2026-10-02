/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import {
  FLYOUT_DESCRIPTOR_KIND,
  type FlyoutDescriptor,
} from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { NormalisedEntityAttachment } from '../entity_attachment/payload';

/** Producers build the payload from a fields map, so values arrive as arrays. */
const firstValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

/**
 * Maps a `security.alert` attachment onto the document flyout it should open, or `null` when
 * the payload identifies nothing (read-only row, agent-created prose).
 */
export const toAlertDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  const alert = (attachment.data as { alert?: unknown })?.alert;
  if (typeof alert !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(alert);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const { _id: id, _index: index } = parsed as Record<string, unknown>;
  const documentId = firstValue(id);
  const indexName = firstValue(index);

  return documentId && indexName
    ? { kind: FLYOUT_DESCRIPTOR_KIND.document, documentId, indexName }
    : null;
};

/**
 * Maps a `security.rule` attachment onto the rule flyout descriptor, or `null` when no id is
 * available (rule drafts, `{}` new-rule attachments).
 */
export const toRuleDescriptor = (attachment: UnknownAttachment): FlyoutDescriptor | null => {
  const data = attachment.data as { text?: unknown } | undefined;
  let ruleId: string | undefined;

  if (typeof data?.text === 'string') {
    try {
      const parsed = JSON.parse(data.text) as { id?: unknown };
      ruleId = typeof parsed?.id === 'string' ? parsed.id : undefined;
    } catch {
      // ignore
    }
  }

  ruleId ??= typeof attachment.origin === 'string' ? attachment.origin : undefined;

  return ruleId ? { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId } : null;
};

/**
 * Maps a normalised entity onto the flyout descriptor that matches its `identifierType`.
 * Returns `null` for unknown types.
 */
export const toEntityDescriptor = (
  entity: NormalisedEntityAttachment['entities'][number]
): FlyoutDescriptor | null => {
  const { identifierType, identifier, entityStoreId } = entity;

  switch (identifierType) {
    case 'host':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.host,
        hostName: identifier,
        entityId: entityStoreId,
      };
    case 'user':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.user,
        userName: identifier,
        entityId: entityStoreId,
      };
    case 'service':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.service,
        serviceName: identifier,
        entityId: entityStoreId,
      };
    case 'generic':
      return entityStoreId
        ? { kind: FLYOUT_DESCRIPTOR_KIND.genericEntity, scopeId: '', entityId: entityStoreId }
        : null;
    default:
      return null;
  }
};
