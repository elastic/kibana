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
import type { InvestigationIocsAttachment } from './types';

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.investigationIocs.label',
  { defaultMessage: 'Indicators of compromise' }
);

const LazyInvestigationIocsInlineContent = React.lazy(() =>
  import('./investigation_iocs_inline_content').then((module) => ({
    default: module.InvestigationIocsInlineContent,
  }))
);

export const createInvestigationIocsAttachmentDefinition =
  (): AttachmentUIDefinition<InvestigationIocsAttachment> => ({
    getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
    getIcon: () => 'flag',
    renderInlineContent: (props: AttachmentRenderProps<InvestigationIocsAttachment>) => (
      <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
        <LazyInvestigationIocsInlineContent {...props} />
      </React.Suspense>
    ),
  });
