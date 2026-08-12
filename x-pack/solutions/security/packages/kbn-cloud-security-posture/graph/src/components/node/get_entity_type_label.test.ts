/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityTypeLabel } from './get_entity_type_label';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';

describe('getEntityTypeLabel', () => {
  it('returns tag when present', () => {
    expect(getEntityTypeLabel({ tag: 'User', shape: 'ellipse' })).toBe('User');
  });

  it('returns entity.type from documentsData when tag is missing', () => {
    expect(
      getEntityTypeLabel({
        shape: 'ellipse',
        documentsData: [
          {
            id: 'user-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: { type: 'User' },
          },
        ],
      })
    ).toBe('User');
  });

  it('returns engine_type label when tag and entity.type are missing', () => {
    expect(
      getEntityTypeLabel({
        shape: 'ellipse',
        icon: 'question',
        documentsData: [
          {
            id: 'user-1',
            type: DOCUMENT_TYPE_ENTITY,
            entity: { engine_type: 'user' },
          },
        ],
      })
    ).toBe('User');
  });

  it('falls back to icon then shape', () => {
    expect(getEntityTypeLabel({ icon: 'user', shape: 'hexagon' })).toBe('User');
    expect(getEntityTypeLabel({ shape: 'ellipse' })).toBe('User');
  });
});
