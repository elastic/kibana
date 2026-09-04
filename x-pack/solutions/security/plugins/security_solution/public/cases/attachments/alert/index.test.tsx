/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
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

  describe('getCreationActivity', () => {
    it('keys AlertEvent by savedObjectId to prevent React fiber reuse across attachments', () => {
      // key={savedObjectId} is the fix for #284799: without it React reuses the AlertEvent
      // fiber across different attachments, carrying stale useQueryAlerts hook state that
      // causes the component to fetch data for the wrong alertId.
      const { event } = registration.getCreationActivity({
        savedObjectId: 'my-so-id',
        attachmentId: 'alert-1',
        metadata: { rule: { id: null, name: null }, index: '.alerts-security.alerts-default' },
        caseData: { id: 'c1', title: 'Case' } as never,
        permissions: {} as never,
        createdBy: {} as never,
        version: '0',
        rowContext: {} as never,
      });

      // The event is <Suspense><AlertEvent key={savedObjectId} .../></Suspense>.
      // React exposes key on the element object (not in element.props).
      const alertEventElement = (event as React.ReactElement).props.children as React.ReactElement;
      expect(alertEventElement.key).toBe('my-so-id');
    });
  });
});
