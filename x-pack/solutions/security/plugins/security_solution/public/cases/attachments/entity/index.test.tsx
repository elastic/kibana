/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { EntityAttachmentPayload } from '../../../../common/cases/attachments/entity';
import { EntityAttachmentPayloadSchema } from '../../../../common/cases/attachments/entity';
import { getEntityAttachment } from '.';
import { TestProvidersComponent } from '../../../threat_intelligence/mocks/test_providers';

type Props = UnifiedReferenceAttachmentViewProps<EntityAttachmentPayload['metadata']>;

const baseProps = {
  caseData: { id: 'case-1', title: 'Case 1' },
  attachmentId: 'entity-id-1',
  metadata: { entityName: 'alice', entityType: 'user' },
} as unknown as Props;

describe('Entity attachment', () => {
  it('creates the attachment type correctly', () => {
    const entityType = getEntityAttachment();

    expect(entityType).toStrictEqual({
      id: SECURITY_ENTITY_ATTACHMENT_TYPE,
      icon: 'user',
      displayName: 'Entities',
      schema: EntityAttachmentPayloadSchema,
      getAttachmentViewObject: expect.any(Function),
      getAttachmentTabViewObject: expect.any(Function),
    });
  });

  it('renders the activity event text correctly', () => {
    const entityType = getEntityAttachment();
    const event = entityType.getAttachmentViewObject(baseProps).event;

    render(<TestProvidersComponent>{event}</TestProvidersComponent>);

    expect(screen.getByText('added an entity')).toBeInTheDocument();
  });
});
