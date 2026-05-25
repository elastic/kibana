/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseAttachmentType } from './case';

describe('createCaseAttachmentType', () => {
  const attachmentType = createCaseAttachmentType();

  it('registers security.case type', () => {
    expect(attachmentType.id).toBe('security.case');
  });

  it('validates case attachment data', () => {
    const result = attachmentType.validate({
      case_id: 'case-1',
      owner: 'securitySolution',
      title: 'Test case',
    });
    expect(result.valid).toBe(true);
  });
});
