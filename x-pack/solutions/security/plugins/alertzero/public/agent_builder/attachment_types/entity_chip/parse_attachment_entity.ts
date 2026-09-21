/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

/**
 * Visual entity kinds used in Hunt Watch attachment chips.
 * Icons mirror Security's EntityIconByType where applicable (duplicated locally
 * to avoid a security_solution dependency from alertzero). `role` and `actor`
 * are attachment-specific kinds for IAM roles and threat actors.
 */
export type AttachmentEntityKind = 'user' | 'host' | 'service' | 'role' | 'actor' | 'generic';

export interface ParsedAttachmentEntity {
  kind: AttachmentEntityKind;
  /** Display name without EUID / ECS / ARN wrapper noise. */
  name: string;
  /** Original raw string from the attachment payload. */
  raw: string;
}

/** Local copy of Security EntityIconByType plus attachment-specific kinds. */
export const ATTACHMENT_ENTITY_ICON: Record<AttachmentEntityKind, IconType> = {
  user: 'user',
  host: 'storage',
  service: 'vectorTriangle',
  role: 'securityApp',
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

const EUID_TYPE_PREFIXES: ReadonlyArray<{ prefix: string; kind: AttachmentEntityKind }> = [
  { prefix: 'entity:user:', kind: 'user' },
  { prefix: 'entity:host:', kind: 'host' },
  { prefix: 'entity:service:', kind: 'service' },
  { prefix: 'entity:generic:', kind: 'generic' },
  { prefix: 'user:', kind: 'user' },
  { prefix: 'host:', kind: 'host' },
  { prefix: 'service:', kind: 'service' },
];

/**
 * Parse an AWS IAM ARN into a short display name and kind.
 * Example: arn:aws:iam::123456789012:user/dev-user → { kind: 'user', name: 'dev-user' }
 */
const parseAwsIamArn = (
  value: string
): { kind: AttachmentEntityKind; name: string } | undefined => {
  const match = value.match(/^arn:aws:iam::\d+:(user|role|group)\/(.+)$/i);
  if (!match) {
    return undefined;
  }
  const resourceType = match[1].toLowerCase();
  const name = match[2];
  if (resourceType === 'user') {
    return { kind: 'user', name };
  }
  if (resourceType === 'role') {
    return { kind: 'role', name };
  }
  return { kind: 'generic', name };
};

/**
 * Strip an EUID wrapper (`entity:generic:…`, `host:…`) and classify the inner id.
 */
const parseEuid = (raw: string): ParsedAttachmentEntity | undefined => {
  const lower = raw.toLowerCase();

  for (const { prefix, kind: wrapperKind } of EUID_TYPE_PREFIXES) {
    if (!lower.startsWith(prefix)) {
      continue;
    }
    const inner = raw.slice(prefix.length).trim();
    if (!inner) {
      return { kind: wrapperKind, name: raw, raw };
    }

    // entity:generic:host:ci-deploy-runner-07
    if (wrapperKind === 'generic') {
      const nestedHost = inner.match(/^host:(.+)$/i);
      if (nestedHost) {
        return { kind: 'host', name: nestedHost[1], raw };
      }
      const nestedUser = inner.match(/^user:(.+)$/i);
      if (nestedUser) {
        return { kind: 'user', name: nestedUser[1], raw };
      }
      const nestedService = inner.match(/^service:(.+)$/i);
      if (nestedService) {
        return { kind: 'service', name: nestedService[1], raw };
      }
    }

    const arn = parseAwsIamArn(inner);
    if (arn) {
      return { kind: arn.kind, name: arn.name, raw };
    }

    return { kind: wrapperKind, name: inner, raw };
  }

  return undefined;
};

/**
 * Parse an attachment entity string into a typed display model.
 * Supports EUIDs (`entity:generic:arn:…`, `entity:generic:host:…`), ECS-prefixed
 * values (`user.name: jdoe`), and AWS IAM ARNs.
 *
 * Unrecognized / bare strings fail closed to `generic` (no Discover link). Hunt
 * writers must emit typed forms; the server schema rejects bare identifiers.
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

  const euid = parseEuid(trimmed);
  if (euid) {
    return euid;
  }

  const arn = parseAwsIamArn(trimmed);
  if (arn) {
    return { kind: arn.kind, name: arn.name, raw: trimmed };
  }

  return { kind: 'generic', name: trimmed, raw: trimmed };
};
