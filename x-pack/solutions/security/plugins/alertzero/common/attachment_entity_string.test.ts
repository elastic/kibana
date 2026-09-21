/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACHMENT_ENTITY_FIELDS,
  isAttachmentEntityField,
  isAttachmentEntityRef,
  isTypedAttachmentEntityString,
  parseTypedAttachmentEntityString,
} from './attachment_entity_string';

describe('attachment_entity_string', () => {
  it('accepts allowlisted entity fields', () => {
    for (const field of ATTACHMENT_ENTITY_FIELDS) {
      expect(isAttachmentEntityField(field)).toBe(true);
    }
  });

  it('rejects unknown fields', () => {
    expect(isAttachmentEntityField('source.ip')).toBe(false);
    expect(isAttachmentEntityField('user.target.name')).toBe(false);
  });

  it('validates entity refs', () => {
    expect(isAttachmentEntityRef({ field: 'user.name', value: 'jdoe' })).toBe(true);
    expect(isAttachmentEntityRef({ field: 'user.name', value: '  ' })).toBe(false);
    expect(isAttachmentEntityRef({ field: 'source.ip', value: '1.2.3.4' })).toBe(false);
    expect(isAttachmentEntityRef('user.name: jdoe')).toBe(false);
  });

  it('parses legacy field: value strings', () => {
    expect(parseTypedAttachmentEntityString('user.name: jdoe')).toEqual({
      field: 'user.name',
      value: 'jdoe',
    });
    expect(isTypedAttachmentEntityString('host.name: srv-01')).toBe(true);
    expect(isTypedAttachmentEntityString('dev-user')).toBe(false);
  });
});
