/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import type { InvestigationTimelineAttachment } from './types';

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.investigationTimeline.label',
  { defaultMessage: 'Attack timeline' }
);

const LazyInvestigationTimelineInlineContent = React.lazy(() =>
  import('./investigation_timeline_inline_content').then((module) => ({
    default: module.InvestigationTimelineInlineContent,
  }))
);

export const createInvestigationTimelineAttachmentDefinition =
  (): AttachmentUIDefinition<InvestigationTimelineAttachment> => ({
    getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
    getIcon: () => 'timeline',
    renderInlineContent: (props: AttachmentRenderProps<InvestigationTimelineAttachment>) => (
      <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
        <LazyInvestigationTimelineInlineContent {...props} />
      </React.Suspense>
    ),
  });
