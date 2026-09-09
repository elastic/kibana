/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinAttachment } from '@kbn/agent-builder-server/allow_lists';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

describe('security attachment types', () => {
  // `AttachmentServiceSetup.registerType` throws for any id missing from the
  // platform allow list, and `registerAttachments` registers sequentially: one
  // unlisted id aborts the whole batch, silently dropping every type after it.
  // Asserting the whole enum keeps that from reaching a running Kibana.
  it.each(Object.values(SecurityAgentBuilderAttachments))(
    '%s is in the agent-builder built-in attachment allow list',
    (attachmentTypeId) => {
      expect(isAllowedBuiltinAttachment(attachmentTypeId)).toBe(true);
    }
  );
});
