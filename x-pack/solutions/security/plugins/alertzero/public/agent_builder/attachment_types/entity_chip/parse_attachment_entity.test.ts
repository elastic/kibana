/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAttachmentEntity } from './parse_attachment_entity';

describe('parseAttachmentEntity', () => {
  it('parses ECS field: value into field, value, and icon kind', () => {
    expect(parseAttachmentEntity('user.name: jdoe')).toEqual({
      field: 'user.name',
      value: 'jdoe',
      kind: 'user',
      raw: 'user.name: jdoe',
    });
    expect(parseAttachmentEntity('host.name: srv-01')).toEqual({
      field: 'host.name',
      value: 'srv-01',
      kind: 'host',
      raw: 'host.name: srv-01',
    });
    expect(parseAttachmentEntity('user.email: dev-user@corp.example')).toEqual({
      field: 'user.email',
      value: 'dev-user@corp.example',
      kind: 'user',
      raw: 'user.email: dev-user@corp.example',
    });
  });

  it('returns undefined for EUID, ARN, and bare strings', () => {
    expect(
      parseAttachmentEntity('entity:generic:arn:aws:iam::123456789012:user/dev-user')
    ).toBeUndefined();
    expect(parseAttachmentEntity('arn:aws:iam::123456789012:role/escalated-role')).toBeUndefined();
    expect(parseAttachmentEntity('dev-user')).toBeUndefined();
    expect(parseAttachmentEntity('entity:generic:host:ci-deploy-runner-07')).toBeUndefined();
  });
});
