/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNonEmptyField, generateEventAttachmentWithoutOwner } from './utils';
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

describe('event utils', () => {
  describe('getNonEmptyField', () => {
    it('returns the same value for non-empty strings', () => {
      expect(getNonEmptyField('logs-*')).toBe('logs-*');
    });

    it('returns the first array item for arrays', () => {
      expect(getNonEmptyField(['logs-1', 'logs-2'])).toBe('logs-1');
    });

    it('returns null for empty values', () => {
      expect(getNonEmptyField('')).toBeNull();
      expect(getNonEmptyField(undefined)).toBeNull();
    });
  });
});

describe('generateEventAttachmentWithoutOwner', () => {
  it('returns scalar values for a single event', () => {
    expect(
      generateEventAttachmentWithoutOwner({ attachmentId: 'event-1', index: 'logs-1' })
    ).toEqual({
      type: SECURITY_EVENT_ATTACHMENT_TYPE,
      attachmentId: 'event-1',
      metadata: { index: 'logs-1' },
    });
  });

  it('returns arrays for multiple events', () => {
    expect(
      generateEventAttachmentWithoutOwner({
        attachmentId: ['event-1', 'event-2'],
        index: ['logs-1', 'logs-2'],
      })
    ).toEqual({
      type: SECURITY_EVENT_ATTACHMENT_TYPE,
      attachmentId: ['event-1', 'event-2'],
      metadata: { index: ['logs-1', 'logs-2'] },
    });
  });

  it('returns undefined when attachmentId is missing', () => {
    expect(generateEventAttachmentWithoutOwner({ attachmentId: '', index: 'logs-1' })).toBe(
      undefined
    );
  });
});
