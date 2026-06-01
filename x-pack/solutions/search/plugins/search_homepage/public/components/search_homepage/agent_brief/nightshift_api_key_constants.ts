/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

/* ----------------------------------------------------------------------- *
 * Shared shape + fixtures for the VectorDB "Expiring API keys" surface.
 *
 * Both the local row UI (`nightshift_expiring_keys_summary.tsx`) and the
 * Agent Builder attachment renderer (`nightshift_api_key_definition.tsx`)
 * read from these — keeping them in a separate, runtime-light module
 * means the Agent Builder side can render without pulling the EUI-heavy
 * row + flyout components into its bundle.
 * ----------------------------------------------------------------------- */

export type ApiKeyAccessRight = 'read' | 'write';

export type ApiKeyExpirySeverity = 'critical' | 'warning';

/**
 * Full data record for an expiring API key. Carries the prototype's
 * fake `value` so the attachment canvas can show a "copy the actual
 * API key" CTA — Stack Management never returns the key value after
 * creation, so in a real flow this would come from the rotation step
 * the agent walks the user through.
 */
export interface NightshiftApiKeyAttachmentData {
  /** Stable id, used for attachment de-duplication. */
  id: string;
  /** Human-readable key name (matches the Stack Management list). */
  name: string;
  /** Relative expiry string, e.g. "1 day", "3 days". */
  expiresIn: string;
  /** Absolute expiry date, e.g. "Jun 4, 2026". */
  expiresAt: string;
  /** Absolute creation date, e.g. "Jun 2, 2025". */
  createdAt: string;
  /** Access rights granted by the key. */
  accessRights: ApiKeyAccessRight[];
  /** Index patterns the key has access to. */
  indexPatterns: string[];
  /** Long-form rotation/impact notes shown in the canvas + flyout. */
  description?: string;
  /** Drives the badge colour on the row + canvas. */
  severity: ApiKeyExpirySeverity;
  /**
   * The encoded API key value (id:secret base64). In Stack Management
   * the value is only exposed at creation time; the prototype carries
   * a fake but realistic-looking encoded value so the attachment's
   * "copy" CTA can be wired up end-to-end.
   */
  value: string;
}

/**
 * Attachment type identifier registered with the Agent Builder
 * attachments service. Pushed into the new conversation as part of
 * `initialAttachments` when the user submits the input with one or
 * more API key pills staged, or when the footer "Create new API keys"
 * CTA is used (one attachment per expiring key).
 */
export const NIGHTSHIFT_API_KEY_TYPE = 'nightshift.apiKey' as const;

export type NightshiftApiKeyAttachment = Attachment<
  typeof NIGHTSHIFT_API_KEY_TYPE,
  NightshiftApiKeyAttachmentData
>;

/*
 * Fake but realistic-looking base64-encoded `<id>:<secret>` values. In
 * a real Elasticsearch flow these would only ever be returned by the
 * create-key endpoint; here they're hardcoded so the attachment's
 * "copy" affordance can be wired up end-to-end without taking a dep
 * on the security service from a prototype surface.
 */
export const EXPIRING_API_KEYS: NightshiftApiKeyAttachmentData[] = [
  {
    id: 'key-ingest-pipeline',
    name: 'ingest-pipeline',
    expiresIn: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.in.tomorrow', {
      defaultMessage: '1 day',
    }),
    expiresAt: 'Jun 2, 2026',
    createdAt: 'Jun 2, 2025',
    accessRights: ['write'],
    indexPatterns: ['logs-*', 'events-*'],
    description: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.description.ingest', {
      defaultMessage:
        'API key used by the Filebeat agents to ship logs and events into the cluster. Rotation impacts ingestion availability — coordinate with the ops on-call.',
    }),
    severity: 'critical',
    value: 'YVo3ZFQ0VUItaW5nZXN0LXBpcGVsaW5lOmtDaDdyOV9lUTItZk0zeFYxcFQwc044ekoyeVg0',
  },
  {
    id: 'key-prod-readwrite',
    name: 'production-read-write',
    expiresIn: i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.in.threeDays', {
      defaultMessage: '3 days',
    }),
    expiresAt: 'Jun 4, 2026',
    createdAt: 'Dec 4, 2025',
    accessRights: ['read', 'write'],
    indexPatterns: ['*'],
    description: i18n.translate(
      'xpack.searchHomepage.nightshift.expiringKeys.description.prodReadWrite',
      {
        defaultMessage:
          'Backend service key with read + write on every index. Used by the recommendations API and the on-call dashboards. Rotate during low-traffic window.',
      }
    ),
    severity: 'warning',
    value: 'YlIycFE5WUItcHJvZHVjdGlvbi1yZWFkLXdyaXRlOnRKMW1IOF94VjUtYUI2c0MzZkQwZ0s0blA5',
  },
];

/**
 * Human-readable access summary used by both the row badge and the
 * attachment canvas. Co-located here so the two surfaces never drift.
 */
export const accessRightsLabel = (rights: ApiKeyAccessRight[]): string => {
  const hasRead = rights.includes('read');
  const hasWrite = rights.includes('write');
  if (hasRead && hasWrite) {
    return i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.access.readWrite', {
      defaultMessage: 'Read + write',
    });
  }
  if (hasWrite) {
    return i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.access.writeOnly', {
      defaultMessage: 'Write',
    });
  }
  return i18n.translate('xpack.searchHomepage.nightshift.expiringKeys.access.readOnly', {
    defaultMessage: 'Read',
  });
};

export const API_KEY_BADGE_COLOR: Record<ApiKeyExpirySeverity, 'danger' | 'warning'> = {
  critical: 'danger',
  warning: 'warning',
};
