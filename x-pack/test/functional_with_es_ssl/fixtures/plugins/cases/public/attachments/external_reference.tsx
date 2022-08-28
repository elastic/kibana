/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { ExternalReferenceAttachmentType } from '@kbn/cases-plugin/public/client/attachment_framework/types';

const AttachmentContentLazy = lazy(() => import('./external_references_content'));

const AttachmentActions: React.FC = () => {
  return (
    <EuiButtonIcon
      data-test-subj="test-attachment-action"
      onClick={() => {}}
      iconType="arrowRight"
      aria-label="See attachment"
    />
  );
};

export const getExternalReferenceAttachmentRegular = (): ExternalReferenceAttachmentType => ({
  id: '.test',
  icon: 'casesApp',
  displayName: 'Test',
  getAttachmentViewObject: () => ({
    event: 'added a chart',
    timelineAvatar: 'casesApp',
    actions: <AttachmentActions />,
    children: AttachmentContentLazy,
  }),
});
