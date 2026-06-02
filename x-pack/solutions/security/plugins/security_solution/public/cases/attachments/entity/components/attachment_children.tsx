/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { EntityAttachmentPayload } from '../../../../../common/cases/attachments/entity';
import { EntityChildren } from './entity_children';

type Props = UnifiedReferenceAttachmentViewProps<EntityAttachmentPayload['metadata']>;

/**
 * Component lazy loaded when rendering a unified `security.entity` attachment.
 * Renders the entity summary in the case attachment view.
 */
const AttachmentChildren = ({ attachmentId, metadata }: Props) => {
  // `EntityAttachmentPayloadSchema` validates `attachmentId` as a single string,
  // but the shared `UnifiedReferenceAttachmentViewProps` types it as `string | string[]`
  // because alert attachments persist arrays. Treat an array as bad data and bail.
  if (!metadata || Array.isArray(attachmentId)) {
    return null;
  }

  return <EntityChildren id={attachmentId} metadata={metadata} />;
};

// eslint-disable-next-line import/no-default-export
export default AttachmentChildren;
