/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSkeletonText } from '@elastic/eui';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import type { HuntCorrelationAttachment } from './types';

const DEFAULT_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.label',
  { defaultMessage: 'Hunt Correlation' }
);

const LazyHuntCorrelationInlineContent = React.lazy(() =>
  import(
    /* webpackChunkName: "alertzero_hunt_correlation_attachment_inline" */
    './hunt_correlation_inline_content'
  ).then((m) => ({ default: m.HuntCorrelationInlineContent }))
);

/**
 * Builds the `security.hunt_correlation` `AttachmentUIDefinition`. Static payload (no live
 * fetch), kept as a factory to mirror the sibling types' registration shape.
 */
export const createHuntCorrelationAttachmentDefinition = ({
  navigation,
}: {
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<HuntCorrelationAttachment> => ({
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'link',
  renderInlineContent: (props) => (
    <React.Suspense fallback={<EuiSkeletonText lines={3} />}>
      <LazyHuntCorrelationInlineContent {...props} navigation={navigation} />
    </React.Suspense>
  ),
});
