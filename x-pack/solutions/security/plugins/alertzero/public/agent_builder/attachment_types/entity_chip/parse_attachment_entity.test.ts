/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAttachmentEntity } from './parse_attachment_entity';

describe('parseAttachmentEntity', () => {
  it('parses ECS-prefixed user and host fields', () => {
    expect(parseAttachmentEntity('user.name: jdoe')).toEqual({
      kind: 'user',
      name: 'jdoe',
      raw: 'user.name: jdoe',
    });
    expect(parseAttachmentEntity('host.name: srv-01')).toEqual({
      kind: 'host',
      name: 'srv-01',
      raw: 'host.name: srv-01',
    });
    expect(parseAttachmentEntity('user.email: dev-user@corp.example')).toEqual({
      kind: 'user',
      name: 'dev-user@corp.example',
      raw: 'user.email: dev-user@corp.example',
    });
  });

  it('treats bare emails as users and host-like values as hosts', () => {
    expect(parseAttachmentEntity('dev-user@corp.example').kind).toBe('user');
    expect(parseAttachmentEntity('ci-deploy-runner-07').kind).toBe('host');
    expect(parseAttachmentEntity('web.example.internal').kind).toBe('host');
  });

  it('defaults bare identity strings like dev-user to user', () => {
    expect(parseAttachmentEntity('dev-user')).toEqual({
      kind: 'user',
      name: 'dev-user',
      raw: 'dev-user',
    });
  });
});
