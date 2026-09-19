/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseAttachmentsWithoutOwner,
  CommonAttachmentListViewProps,
  UnifiedReferenceAttachmentViewProps,
} from '@kbn/cases-plugin/public';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { AttachmentActionType, SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import React, { Suspense, type ComponentType } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../entity_analytics/components/entity_store/entity_icon_by_type';
import type { EntityAttachmentMetadata } from '../../../../common/cases/attachments/entity';
import { EntityAttachmentPayloadSchema } from '../../../../common/cases/attachments/entity';
import { ENTITY_STORE_INDEX_PATTERN } from '../../../../common/entity_analytics/entity_store/constants';

export type { EntityAttachmentMetadata };
export interface EntityToAttach {
  id: string;
  name: string;
  type: EntityAttachmentMetadata['entityType'];
  riskScore?: number;
  riskLevel?: string;
}

const EntityAttachmentChildrenLazy = React.lazy(() => import('./components/attachment_children'));
const EntityTabContentLazy = React.lazy(() => import('./components/entity_tab_content'));
const ShowEntityButton = React.lazy(async () => {
  const { ShowEntityButton: Component } = await import('./components/show_entity_button');
  return { default: Component };
});

const EntityTabContentWrapper: ComponentType<CommonAttachmentListViewProps> = (props) => (
  <Suspense fallback={null}>
    <EntityTabContentLazy {...props} />
  </Suspense>
);

type EntityAttachmentViewProps = UnifiedReferenceAttachmentViewProps<EntityAttachmentMetadata>;

const DISPLAY_NAME = i18n.translate('xpack.securitySolution.entityAnalytics.cases.displayName', {
  defaultMessage: 'Entities',
});

export const getEntityAttachment = () =>
  defineAttachment({
    id: SECURITY_ENTITY_ATTACHMENT_TYPE,
    getIcon: (props) => {
      const entityType = props.metadata?.entityType;
      return entityType ? EntityIconByType[entityType as EntityType] ?? 'globe' : 'globe';
    },
    getLabel: () => DISPLAY_NAME,
    schema: EntityAttachmentPayloadSchema,
    getCreationActivity: () => ({
      eventColor: 'subdued' as const,
      event: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.cases.eventDescription"
          defaultMessage="added an entity"
        />
      ),
      children: EntityAttachmentChildrenLazy,
      getActions: (actionProps: EntityAttachmentViewProps) => {
        const { metadata } = actionProps;
        if (!metadata) return [];
        return [
          {
            type: AttachmentActionType.CUSTOM as const,
            isPrimary: true,
            render: () => (
              <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                <ShowEntityButton
                  id={actionProps.savedObjectId}
                  entityId={
                    Array.isArray(actionProps.attachmentId)
                      ? actionProps.attachmentId[0]
                      : actionProps.attachmentId
                  }
                  entityName={metadata.entityName ?? ''}
                  entityType={metadata.entityType ?? ''}
                />
              </Suspense>
            ),
          },
        ];
      },
    }),
    getAttachmentList: () => ({
      children: EntityTabContentWrapper,
    }),
  });

/**
 * Builds the unified `security.entity` attachment payload posted to a case, including the
 * metadata persisted alongside it so the attachment view can render without re-fetching the
 * entity.
 *
 * Returns the cases-framework "without owner" payload — the cases UI injects the `owner` at
 * creation time, so callers hand the attachment over without it. Returns an empty array when
 * the entity has no id.
 *
 * @param entity the entity we're attaching to a case
 */
export const generateEntityAttachmentsWithoutOwner = (
  entity: EntityToAttach
): CaseAttachmentsWithoutOwner => {
  if (!entity.id) {
    return [];
  }

  return [
    {
      type: SECURITY_ENTITY_ATTACHMENT_TYPE,
      attachmentId: entity.id,
      metadata: {
        entityName: entity.name,
        entityType: entity.type,
        // Lets the Cases platform pair this attachment's id with an index so the
        // "already attached" duplicate check works (unified matching needs id+index).
        index: ENTITY_STORE_INDEX_PATTERN,
        ...(entity.riskScore != null ? { riskScore: entity.riskScore } : {}),
        ...(entity.riskLevel != null ? { riskLevel: entity.riskLevel } : {}),
      } satisfies EntityAttachmentMetadata,
    },
  ];
};
