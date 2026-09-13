/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { AttachmentActionType, SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
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

    expect(entityType.getIcon({} as Props)).toBe('globe');
    expect(entityType.getLabel()).toBe('Entities');
    expect(entityType).toStrictEqual({
      id: SECURITY_ENTITY_ATTACHMENT_TYPE,
      getIcon: expect.any(Function),
      getLabel: expect.any(Function),
      schema: EntityAttachmentPayloadSchema,
      getCreationActivity: expect.any(Function),
      getAttachmentList: expect.any(Function),
    });
  });

  it('renders the activity event text correctly', () => {
    const entityType = getEntityAttachment();
    const event = entityType.getCreationActivity(baseProps).event;

    render(<TestProvidersComponent>{event}</TestProvidersComponent>);

    expect(screen.getByText('added an entity')).toBeInTheDocument();
  });

  describe('getIcon', () => {
    const getIconType = (metadata: Props['metadata']): unknown => {
      const props = { ...baseProps, metadata } as Props;
      return getEntityAttachment().getIcon(props);
    };

    it.each([
      ['user', 'user'],
      ['host', 'storage'],
      ['service', 'vectorTriangle'],
      ['generic', 'globe'],
    ])('uses the %s entity icon', (entityType, expectedIcon) => {
      expect(getIconType({ entityName: 'foo', entityType } as Props['metadata'])).toBe(
        expectedIcon
      );
    });

    it('falls back to the globe icon when the entity type is missing', () => {
      expect(getIconType(undefined)).toBe('globe');
    });
  });

  describe('getActions', () => {
    it('returns a primary custom action when metadata is present', () => {
      const attachment = getEntityAttachment();
      const actions = attachment.getCreationActivity(baseProps).getActions?.(baseProps);
      expect(actions).toHaveLength(1);
      expect(actions?.[0]).toMatchObject({
        type: AttachmentActionType.CUSTOM,
        isPrimary: true,
        render: expect.any(Function),
      });
    });

    it('returns no actions when metadata is missing', () => {
      const attachment = getEntityAttachment();
      const propsWithoutMetadata = { ...baseProps, metadata: undefined } as unknown as Props;
      const actions = attachment
        .getCreationActivity(propsWithoutMetadata)
        .getActions?.(propsWithoutMetadata);
      expect(actions).toHaveLength(0);
    });
  });
});
