/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEventAttachmentType } from './cases/attachments/event';

describe('security.event attachment type', () => {
  it('accepts metadata.index as string and string[]', () => {
    const eventAttachmentType = getEventAttachmentType();

    expect(() => eventAttachmentType.schemaValidator({ index: 'logs-endpoint-*' })).not.toThrow();
    expect(() => eventAttachmentType.schemaValidator({ index: ['logs-endpoint-*'] })).not.toThrow();
  });

  it('rejects invalid metadata.index types', () => {
    const eventAttachmentType = getEventAttachmentType();

    expect(() => eventAttachmentType.schemaValidator({ index: 123 })).toThrow(
      'metadata.index must be a string or an array of strings'
    );
  });
});
