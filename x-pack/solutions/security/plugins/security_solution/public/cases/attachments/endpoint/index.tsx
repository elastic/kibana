/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { defineAttachment } from '@kbn/cases-plugin/public';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EndpointAttachmentPayloadSchema } from '../../../../common/cases/attachments/endpoint';
import type { EndpointMetadata } from './types';
import { ENDPOINT_DISPLAY_NAME } from './translations';

const LazyEvent = lazy(() => import('./endpoint_event'));
const LazyChildren = lazy(() => import('./endpoint_children'));

type EndpointViewProps = UnifiedReferenceAttachmentViewProps<EndpointMetadata>;

const getEventContent = (props: EndpointViewProps) => (
  <Suspense fallback={null}>
    <LazyEvent {...props} />
  </Suspense>
);

export const getEndpointUnifiedAttachment = () =>
  defineAttachment({
    id: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
    getIcon: (props: EndpointViewProps) =>
      props.metadata?.command === 'isolate' ? 'lock' : 'lockOpen',
    getLabel: () => ENDPOINT_DISPLAY_NAME,
    schema: EndpointAttachmentPayloadSchema,
    getCreationActivity: (props) => ({
      event: getEventContent(props),
      children: LazyChildren,
    }),
  });
