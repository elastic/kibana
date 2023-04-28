/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type {
  AttachmentActionType,
  ExternalReferenceAttachmentType,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';

const AttachmentContentLazy = lazy(() => import('./external_references_content'));

export const getExternalReferenceAttachmentRegular = (): ExternalReferenceAttachmentType => ({
  id: '.test',
  icon: 'casesApp',
  displayName: 'Test',
  getAttachmentViewObject: () => ({
    event: 'added a chart',
    timelineAvatar: 'casesApp',
    getActions: () => [
      {
        type: 'button' as AttachmentActionType.BUTTON,
        label: 'See attachment',
        onClick: () => {},
        isPrimary: true,
        iconType: 'arrowRight',
      },
    ],
    children: AttachmentContentLazy,
  }),
});
