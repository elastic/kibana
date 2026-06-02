/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';

/* ----------------------------------------------------------------------- *
 * Shared shape for the VectorDB "Create API key" attachment.
 *
 * Co-located with the other agent-brief constants so the client UI
 * definition and the server-side type registration can both import
 * from the same module without pulling in EUI / React on the server.
 *
 * The attachment is intentionally minimal: it's a "blank ticket" the
 * user fills in via the platform-shared `ApiKeyFlyout` from within
 * the conversation. The created key value never reaches the agent —
 * the server `format` reports only whether a key has been created
 * (and its label) so the agent has context, never the secret.
 * ----------------------------------------------------------------------- */

export const NIGHTSHIFT_CREATE_API_KEY_TYPE = 'nightshift.createApiKey' as const;

export interface NightshiftCreateApiKeyAttachmentData {
  /** Stable id, used as the dedupe key for the attachment + created-key state lookup. */
  id: string;
  /** Optional default name pre-filled into the flyout. */
  defaultName?: string;
  /**
   * Optional short scope hint (e.g. "read + write on `logs-*`") that
   * the inline card can surface so the user knows what the agent is
   * recommending before they open the flyout.
   */
  scopeHint?: string;
}

export type NightshiftCreateApiKeyAttachment = Attachment<
  typeof NIGHTSHIFT_CREATE_API_KEY_TYPE,
  NightshiftCreateApiKeyAttachmentData
>;
