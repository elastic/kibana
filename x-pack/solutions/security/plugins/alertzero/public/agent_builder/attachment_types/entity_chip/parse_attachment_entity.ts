/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import {
  parseTypedAttachmentEntityString,
  type AttachmentEntityField,
} from '../../../../common/attachment_entity_string';

/**
 * Visual kinds for chip icons. `actor` is hunt-correlation only (kindOverride).
 * Entity chips derive kind from the ECS field on the payload.
 */
export type AttachmentEntityKind = 'user' | 'host' | 'service' | 'actor' | 'generic';

export interface ParsedAttachmentEntity {
  field: AttachmentEntityField;
  value: string;
  kind: Exclude<AttachmentEntityKind, 'actor'>;
  raw: string;
}

export const ATTACHMENT_ENTITY_ICON: Record<AttachmentEntityKind, IconType> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
  actor: 'user',
  generic: 'globe',
};

const FIELD_TO_KIND: Readonly<Record<AttachmentEntityField, Exclude<AttachmentEntityKind, 'actor'>>> =
  {
    'user.name': 'user',
    'user.email': 'user',
    'user.id': 'user',
    'host.name': 'host',
    'host.hostname': 'host',
    'host.id': 'host',
    'service.name': 'service',
    'service.id': 'service',
  };

/**
 * Parse an SSE entity string (`field: value`) into a display/query model.
 * Returns undefined when the string is not an allowlisted ECS form (stale or
 * malformed attachments render as plain text without a Discover link).
 */
export const parseAttachmentEntity = (raw: string): ParsedAttachmentEntity | undefined => {
  const parsed = parseTypedAttachmentEntityString(raw);
  if (!parsed) {
    return undefined;
  }

  return {
    field: parsed.field,
    value: parsed.value,
    kind: FIELD_TO_KIND[parsed.field],
    raw: raw.trim(),
  };
};
