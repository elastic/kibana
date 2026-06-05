/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { APP_UI_ID } from '../../../common/constants';
import {
  buildAlertAttachmentSourceLink,
  parseAlertAttachmentPayload,
} from './alert_attachment_source_link';

describe('parseAlertAttachmentPayload', () => {
  it('returns parsed JSON when alert data is JSON', () => {
    const attachment = {
      id: 'alert-1',
      type: 'security.alert',
      data: {
        alert: JSON.stringify({
          _id: ['alert-id'],
          _index: ['.alerts-security.alerts-default'],
        }),
      },
    } as UnknownAttachment;

    expect(parseAlertAttachmentPayload(attachment)).toEqual({
      _id: ['alert-id'],
      _index: ['.alerts-security.alerts-default'],
    });
  });

  it('returns undefined for non-JSON alert payloads', () => {
    const attachment = {
      id: 'alert-1',
      type: 'security.alert',
      data: { alert: 'Host: SRVWIN04\nRule: Test' },
    } as UnknownAttachment;

    expect(parseAlertAttachmentPayload(attachment)).toBeUndefined();
  });
});

describe('buildAlertAttachmentSourceLink', () => {
  const application = {
    getUrlForApp: jest.fn().mockReturnValue('/app/security/alerts/redirect/alert-id'),
  } as unknown as ApplicationStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a Security alert details link from essential alert fields', () => {
    const attachment = {
      id: 'attachment-1',
      type: 'security.alert',
      data: {
        alert: JSON.stringify({
          _id: ['alert-id'],
          _index: ['.internal.alerts-security.alerts-default-000001'],
          '@timestamp': ['2026-06-02T18:00:00.000Z'],
        }),
      },
    } as UnknownAttachment;

    const link = buildAlertAttachmentSourceLink({ attachment, application });

    expect(link).toEqual({
      href: '/app/security/alerts/redirect/alert-id',
    });
    expect(application.getUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      path: expect.stringContaining('/alerts/redirect/alert-id'),
    });
    expect(application.getUrlForApp).toHaveBeenCalledWith(APP_UI_ID, {
      path: expect.stringContaining('index=.alerts-security.alerts-default'),
    });
  });

  it('returns undefined for preview alerts', () => {
    const attachment = {
      id: 'attachment-1',
      type: 'security.alert',
      data: {
        alert: JSON.stringify({
          _id: ['alert-id'],
          _index: ['.preview.alerts-security.alerts-default'],
          '@timestamp': ['2026-06-02T18:00:00.000Z'],
        }),
      },
    } as UnknownAttachment;

    expect(buildAlertAttachmentSourceLink({ attachment, application })).toBeUndefined();
  });

  it('builds a link when @timestamp was stored as a nested array', () => {
    const attachment = {
      id: 'attachment-1',
      type: 'security.alert',
      data: {
        alert: JSON.stringify({
          _id: ['alert-id'],
          _index: ['.internal.alerts-security.alerts-default-000001'],
          '@timestamp': [['2026-06-02T18:00:00.000Z']],
        }),
      },
    } as UnknownAttachment;

    expect(buildAlertAttachmentSourceLink({ attachment, application })).toEqual({
      href: '/app/security/alerts/redirect/alert-id',
    });
  });
});
