/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

/**
 * Visual entity kinds used in Hunt Watch attachment chips.
 * Icons mirror Security's EntityIconByType (duplicated locally to avoid a
 * security_solution dependency from alertzero).
 */
export type AttachmentEntityKind = 'user' | 'host' | 'service' | 'actor' | 'generic';

export interface ParsedAttachmentEntity {
  kind: AttachmentEntityKind;
  /** Display name without ECS field prefix. */
  name: string;
  /** Original raw string from the attachment payload. */
  raw: string;
}

/** Local copy of Security EntityIconByType for attachment UI only. */
export const ATTACHMENT_ENTITY_ICON: Record<AttachmentEntityKind, IconType> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
  actor: 'user',
  generic: 'globe',
};

const ECS_FIELD_TO_KIND: ReadonlyArray<{ prefix: string; kind: AttachmentEntityKind }> = [
  { prefix: 'user.name:', kind: 'user' },
  { prefix: 'user.email:', kind: 'user' },
  { prefix: 'user.id:', kind: 'user' },
  { prefix: 'host.name:', kind: 'host' },
  { prefix: 'host.hostname:', kind: 'host' },
  { prefix: 'host.id:', kind: 'host' },
  { prefix: 'service.name:', kind: 'service' },
  { prefix: 'service.id:', kind: 'service' },
];

const looksLikeEmail = (value: string): boolean => value.includes('@') && !value.includes(' ');

const looksLikeHostname = (value: string): boolean => {
  if (value.includes(' ')) {
    return false;
  }
  // FQDN-ish or common host naming conventions from demo packs.
  if (value.includes('.') && /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(value)) {
    return true;
  }
  // Prefixes must not include the separator; `ci-` in the group would consume
  // the hyphen and fail the following `[-_]` for values like `ci-deploy-runner-07`.
  return /^(host|srv|server|ci|runner|endpoint)[-_]/i.test(value);
};

/**
 * Parse an attachment entity string into a typed display model.
 * Supports ECS-prefixed values (`user.name: jdoe`) and bare identifiers.
 */
export const parseAttachmentEntity = (raw: string): ParsedAttachmentEntity => {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  for (const { prefix, kind } of ECS_FIELD_TO_KIND) {
    if (lower.startsWith(prefix)) {
      const name = trimmed.slice(prefix.length).trim();
      return { kind, name: name || trimmed, raw: trimmed };
    }
  }

  if (looksLikeEmail(trimmed)) {
    return { kind: 'user', name: trimmed, raw: trimmed };
  }
  if (looksLikeHostname(trimmed)) {
    return { kind: 'host', name: trimmed, raw: trimmed };
  }

  // Bare identity strings like `dev-user` default to user for highlight treatment.
  return { kind: 'user', name: trimmed, raw: trimmed };
};
