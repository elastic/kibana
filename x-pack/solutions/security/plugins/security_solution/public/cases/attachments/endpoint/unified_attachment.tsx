/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiAvatar } from '@elastic/eui';
import type {
  UnifiedReferenceAttachmentType,
  UnifiedReferenceAttachmentViewProps,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { CASE_ATTACHMENT_ENDPOINT_TYPE_ID } from '../../../../common/constants';

const LazyUnifiedEvent = lazy(() => import('./unified_event'));
const LazyUnifiedChildren = lazy(() => import('./unified_children'));

const getUnifiedEventContent = (props: UnifiedReferenceAttachmentViewProps) => (
  <Suspense fallback={null}>
    <LazyUnifiedEvent {...props} />
  </Suspense>
);

export const getEndpointUnifiedAttachment = (): UnifiedReferenceAttachmentType => ({
  id: CASE_ATTACHMENT_ENDPOINT_TYPE_ID,
  icon: 'lockOpen',
  displayName: 'Endpoint',
  getAttachmentViewObject: (props) => {
    const iconType = props.metadata?.command === 'isolate' ? 'lock' : 'lockOpen';

    return {
      event: getUnifiedEventContent(props),
      timelineAvatar: (
        <EuiAvatar name="endpoint" color="subdued" iconType={iconType} aria-label={iconType} />
      ),
      children: LazyUnifiedChildren,
    };
  },
});
