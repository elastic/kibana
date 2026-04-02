/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { LazyExoticComponent } from 'react';
import { EuiAvatar } from '@elastic/eui';
import type {
  UnifiedReferenceAttachmentType,
  UnifiedReferenceAttachmentViewProps,
} from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

/**
 * Lazy-loaded components accept EndpointAttachmentProps (union of legacy + unified).
 * Cast to the unified view props type to satisfy the registry contract.
 */
const LazyEvent = lazy(() => import('./external_reference_event'));
const LazyChildren = lazy(
  () => import('./external_reference_children')
) as unknown as LazyExoticComponent<
  (props: UnifiedReferenceAttachmentViewProps) => React.ReactElement | null
>;

const getEventContent = (props: UnifiedReferenceAttachmentViewProps) => (
  <Suspense fallback={null}>
    <LazyEvent {...props} />
  </Suspense>
);

export const getEndpointUnifiedAttachment = (): UnifiedReferenceAttachmentType => ({
  id: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  icon: 'lockOpen',
  displayName: 'Endpoint',
  getAttachmentViewObject: (props) => {
    const iconType = props.metadata?.command === 'isolate' ? 'lock' : 'lockOpen';

    return {
      event: getEventContent(props),
      timelineAvatar: (
        <EuiAvatar name="endpoint" color="subdued" iconType={iconType} aria-label={iconType} />
      ),
      children: LazyChildren,
    };
  },
});
