/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { RulePreviewAttachment, RulePreviewAttachmentServices } from './types';
import { RulePreviewInlineContent } from './inline_content';

export const createRulePreviewAttachmentDefinition = ({
  data,
  spaces,
  getServices,
  getStore,
}: RulePreviewAttachmentServices): AttachmentUIDefinition<RulePreviewAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.rulePreviewAttachment.label', {
      defaultMessage: 'Rule preview',
    }),
  getIcon: () => 'inspect',
  renderInlineContent: (props) => (
    <RulePreviewInlineContent
      {...props}
      data={data}
      spaces={spaces}
      getServices={getServices}
      getStore={getStore}
    />
  ),
});

export const registerRulePreviewAttachment = ({
  attachments,
  data,
  spaces,
  getServices,
  getStore,
}: {
  attachments: AttachmentServiceStartContract;
} & RulePreviewAttachmentServices): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.rulePreview,
    createRulePreviewAttachmentDefinition({ data, spaces, getServices, getStore })
  );
};
