/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSecurityAlertType } from '.';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { SecurityAlertAttachmentPayloadSchema } from '../../../../common/cases/attachments/alert';

describe('getSecurityAlertType', () => {
  const registration = getSecurityAlertType();

  it('registers with the correct id', () => {
    expect(registration.id).toBe(SECURITY_ALERT_ATTACHMENT_TYPE);
  });

  it('registers the zod payload schema', () => {
    expect(registration.schema).toBe(SecurityAlertAttachmentPayloadSchema);
  });
});
