/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CaseAttachmentsWithoutOwner,
  CommonAttachmentTabViewProps,
} from '@kbn/cases-plugin/public';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { JsonValue } from '@kbn/utility-types';
import React, { Suspense, type ComponentType } from 'react';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EntityAttachmentMetadata } from '../../../../common/cases/attachments/entity';
import { EntityAttachmentPayloadSchema } from '../../../../common/cases/attachments/entity';

export type { EntityAttachmentMetadata };

/**
 * A minimal, decoupled representation of the entity we want to attach to a case.
 * Kept independent from Entity Analytics internal models so the "add to case"
 * entry points can be wired in from any surface (flyout, table, etc.).
 */
export interface EntityToAttach {
  /** The canonical entity id (EUID) from the entity store. Stored as `attachmentId`. */
  id: string;
  /** Human-readable entity name. */
  name: string;
  /** The kind of entity. */
  type: EntityAttachmentMetadata['entityType'];
  /** Optional risk score captured at attach time. */
  riskScore?: number;
  /** Optional risk level captured at attach time. */
  riskLevel?: string;
}

const EntityAttachmentChildrenLazy = React.lazy(() => import('./components/attachment_children'));
const EntityTabContentLazy = React.lazy(() => import('./components/entity_tab_content'));

const EntityTabContentWrapper: ComponentType<CommonAttachmentTabViewProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <EntityTabContentLazy {...props} />
  </Suspense>
);

const DISPLAY_NAME = i18n.translate('xpack.securitySolution.entityAnalytics.cases.displayName', {
  defaultMessage: 'Entities',
});
const ENTITY_AVATAR_ARIA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.cases.entityAttachment.avatarAriaLabel',
  {
    defaultMessage: 'entity',
  }
);
const ENTITY_AVATAR_NAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.cases.entityAttachment.avatarNameLabel',
  {
    defaultMessage: 'entity',
  }
);
const REMOVED_ENTITY_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.cases.entityAttachment.removedLabel',
  {
    defaultMessage: 'removed entity',
  }
);
const DELETE_ENTITY_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.cases.entityAttachment.deleteSuccessTitle',
  {
    defaultMessage: 'Deleted entity attachment',
  }
);

/**
 * Defines the `security.entity` cases attachment registered with the cases attachment framework.
 */
export const getEntityAttachment = () =>
  defineAttachment({
    id: SECURITY_ENTITY_ATTACHMENT_TYPE,
    icon: 'user',
    displayName: DISPLAY_NAME,
    schema: EntityAttachmentPayloadSchema,
    getAttachmentViewObject: () => ({
      eventColor: 'subdued' as const,
      event: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.cases.eventDescription"
          defaultMessage="added an entity"
        />
      ),
      timelineAvatar: (
        <EuiAvatar
          name={ENTITY_AVATAR_NAME}
          color="subdued"
          iconType="user"
          aria-label={ENTITY_AVATAR_ARIA}
        />
      ),
      children: EntityAttachmentChildrenLazy,
      deleteSuccessTitle: DELETE_ENTITY_SUCCESS_TITLE,
    }),
    getAttachmentRemovalObject: () => ({
      event: REMOVED_ENTITY_LABEL,
    }),
    getAttachmentTabViewObject: () => ({
      children: EntityTabContentWrapper,
    }),
  });

/**
 * Builds the metadata persisted alongside the entity attachment so the attachment view
 * can render without re-fetching the entity.
 *
 * @param entity the entity we're attaching to a case
 */
export const generateEntityAttachmentsMetadata = (
  entity: EntityToAttach
): EntityAttachmentMetadata => ({
  entityName: entity.name,
  entityType: entity.type,
  ...(entity.riskScore != null ? { riskScore: entity.riskScore } : {}),
  ...(entity.riskLevel != null ? { riskLevel: entity.riskLevel } : {}),
});

/**
 * Builds the unified `security.entity` attachment payload posted to a case.
 *
 * @param entityId the entity id (stored as `attachmentId`)
 * @param attachmentMetadata entity fields persisted alongside the attachment for display
 */
export const generateEntityAttachmentsWithoutOwner = (
  entityId: string,
  attachmentMetadata: EntityAttachmentMetadata
): CaseAttachmentsWithoutOwner => {
  if (!entityId) {
    return [];
  }

  return [
    {
      type: SECURITY_ENTITY_ATTACHMENT_TYPE,
      attachmentId: entityId,
      metadata: attachmentMetadata as unknown as { [p: string]: JsonValue },
    },
  ];
};
