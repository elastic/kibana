/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  buildAlertAttachmentPayloadSchema,
} from '@kbn/cases-plugin/common';

/**
 * Full unified-payload schema for `security.alert`. Registered on the unified
 * registry via `schema:` so the cases plugin validates the entire payload and
 * the client renderer gets typed `metadata` / `attachmentId` props.
 */
export const SecurityAlertAttachmentPayloadSchema = buildAlertAttachmentPayloadSchema(
  SECURITY_ALERT_ATTACHMENT_TYPE
);
