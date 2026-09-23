/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentNavigationDeps } from '../navigation';
import { lazyInlineContent } from '../shared/attachment_definition_helpers';
import {
  buildHuntCorrelationActionButtons,
  buildHuntCorrelationSummary,
  parseHuntCorrelationData,
} from './view_model';
import type { HuntCorrelationAttachment } from './view_model';
import type { HuntCorrelationInlineContentProps } from './hunt_correlation_inline_content';

const DEFAULT_LABEL = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.huntCorrelation.label',
  { defaultMessage: 'Hunt Correlation' }
);

const LazyHuntCorrelationInlineContent = lazyInlineContent<HuntCorrelationInlineContentProps>(
  () =>
    import(
      /* webpackChunkName: "alertzero_hunt_correlation_attachment_inline" */
      './hunt_correlation_inline_content'
    ).then((m) => ({ default: m.HuntCorrelationInlineContent })),
  3
);

/**
 * Builds the `security.hunt_correlation` `AttachmentUIDefinition`. Static payload (no live
 * fetch).
 */
export const createHuntCorrelationAttachmentDefinition = ({
  navigation,
}: {
  navigation: AttachmentNavigationDeps;
}): AttachmentUIDefinition<HuntCorrelationAttachment> => ({
  getLabel: (attachment) => attachment?.data?.attachmentLabel ?? DEFAULT_LABEL,
  getIcon: () => 'link',
  // Threshold state is shown in the card body; the header stays title + subtitle.
  getHeader: ({ attachment }) => {
    const parsed = parseHuntCorrelationData(attachment?.data);
    const { subtitle } = buildHuntCorrelationSummary(parsed);

    return {
      icon: 'link',
      subtitle,
    };
  },
  renderInlineContent: (props) => (
    <LazyHuntCorrelationInlineContent {...props} navigation={navigation} />
  ),
  getActionButtons: ({ attachment }) =>
    buildHuntCorrelationActionButtons({
      parsed: parseHuntCorrelationData(attachment?.data),
      navigation,
    }),
});
