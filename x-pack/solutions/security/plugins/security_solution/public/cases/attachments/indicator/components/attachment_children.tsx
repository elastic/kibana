/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public';
import type { IndicatorAttachmentPayload } from '../../../../../common/cases/attachments/indicator';
import { CommentChildren } from './comment_children';

type Props = UnifiedReferenceAttachmentViewProps<IndicatorAttachmentPayload['metadata']>;

/**
 * Component lazy loaded when creating a new unified `indicator` attachment.
 * Renders the indicator summary in the case attachment view.
 */
const AttachmentChildren = ({ attachmentId, metadata }: Props) => {
  // `IndicatorAttachmentPayloadSchema` validates `attachmentId` as a single string,
  // but the shared `UnifiedReferenceAttachmentViewProps` types it as `string | string[]`
  // because alert attachments persist arrays. Treat an array as bad data and bail.
  if (!metadata || Array.isArray(attachmentId)) {
    return null;
  }

  return <CommentChildren id={attachmentId} metadata={metadata} />;
};

// eslint-disable-next-line import/no-default-export
export default AttachmentChildren;
