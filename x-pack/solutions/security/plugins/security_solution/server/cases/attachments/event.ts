/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

/**
 * Server-side event attachment type registration.
 * schemaValidator receives metadata for reference-based attachments.
 */
export const getEventAttachmentType = () => ({
  id: EVENT_ATTACHMENT_TYPE,
  schemaValidator: (metadata: unknown) => {
    if (metadata != null && typeof metadata === 'object') {
      const m = metadata as Record<string, unknown>;
      if (m.index != null) {
        const index = m.index;
        if (typeof index !== 'string') {
          throw badRequest('metadata.index must be a string');
        }
      }
    }
  },
});
