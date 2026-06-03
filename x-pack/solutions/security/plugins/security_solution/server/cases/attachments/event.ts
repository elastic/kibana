/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { SECURITY_EVENT_ATTACHMENT_TYPE, assertValidIndexMetadata } from '@kbn/cases-plugin/common';

/**
 * Server-side event attachment type registration.
 * schemaValidator receives metadata for reference-based attachments.
 */
export const getEventAttachmentType = () => ({
  id: SECURITY_EVENT_ATTACHMENT_TYPE,
  schemaValidator: (metadata: unknown) => {
    try {
      assertValidIndexMetadata(metadata);
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : 'Invalid index metadata');
    }
  },
});
