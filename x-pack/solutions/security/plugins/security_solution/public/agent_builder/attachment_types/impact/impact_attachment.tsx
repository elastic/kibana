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
import type { ImpactAttachment } from './types';

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attachments.impact.label',
  { defaultMessage: 'Alert impact' }
);

const LazyImpactInlineContent = React.lazy(() =>
  import('./impact_inline_content').then((module) => ({
    default: module.ImpactInlineContent,
  }))
);

export const createImpactAttachmentDefinition = (): AttachmentUIDefinition<ImpactAttachment> => ({
  getLabel: (attachment) => {
    const data = attachment?.data;
    if (data?.attachmentLabel) {
      return data.attachmentLabel;
    }
    const entities = data?.entities ?? [];
    if (entities.length === 0) {
      return DEFAULT_LABEL;
    }
    const hosts = entities.filter((e) => e.entity_type === 'host').length;
    const users = entities.filter((e) => e.entity_type === 'user').length;
    const parts: string[] = [];
    if (hosts > 0) parts.push(`${hosts} host${hosts > 1 ? 's' : ''}`);
    if (users > 0) parts.push(`${users} user${users > 1 ? 's' : ''}`);
    return `Impact — ${parts.join(', ')}`;
  },
  getIcon: () => 'alert',
  renderInlineContent: (props: AttachmentRenderProps<ImpactAttachment>) => (
    <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
      <LazyImpactInlineContent {...props} />
    </React.Suspense>
  ),
  renderConversationDetailsContent: ({ attachment }) => (
    <React.Suspense fallback={<EuiSkeletonText lines={4} />}>
      <LazyImpactInlineContent attachment={attachment} isSidebar={true} />
    </React.Suspense>
  ),
});
