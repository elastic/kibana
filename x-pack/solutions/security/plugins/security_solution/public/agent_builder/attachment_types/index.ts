/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentContentProps } from '@kbn/agent-builder-browser/attachments';
import type { ReactNode } from 'react';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

// Framework support being added: https://github.com/elastic/kibana/pull/248935

/**
 * Extension of UnknownAttachment that includes an optional attachmentLabel field in the data property
 */
type UnknownAttachmentWithLabel = Attachment<
  string,
  { attachmentLabel?: string } & Record<string, unknown>
>;

interface AttachmentTypeConfig {
  type: SecurityAgentBuilderAttachments;
  label: string;
  icon: string;
  // customRenderer?: (props: AttachmentContentProps<UnknownAttachmentWithLabel>) => ReactNode;
}

const ATTACHMENT_TYPE_CONFIGS: AttachmentTypeConfig[] = [
  {
    type: SecurityAgentBuilderAttachments.alert,
    label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.alert.label', {
      defaultMessage: 'Security Alert',
    }),
    icon: 'bell',
  },
  {
    type: SecurityAgentBuilderAttachments.entity,
    label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.label', {
      defaultMessage: 'Risk Entity',
    }),
    icon: 'user',
    // customRenderer: (props: AttachmentContentProps<UnknownAttachmentWithLabel>) => {},
  },
  {
    type: SecurityAgentBuilderAttachments.rule,
    label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.rule.label', {
      defaultMessage: 'Security Rule',
    }),
    icon: 'document',
  },
];

const createAttachmentTypeConfig = (
  defaultLabel: string,
  icon: string,
  customRenderer?: (props: AttachmentContentProps<UnknownAttachmentWithLabel>) => ReactNode
) => ({
  getLabel: (attachment: UnknownAttachmentWithLabel) => {
    const attachmentLabel = attachment?.data?.attachmentLabel;
    return attachmentLabel ?? defaultLabel;
  },
  getIcon: () => icon,
  ...(customRenderer && { renderContent: customRenderer }),
});

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  ATTACHMENT_TYPE_CONFIGS.forEach(({ type, label, icon /* , customRenderer*/ }) => {
    attachments.addAttachmentType<UnknownAttachmentWithLabel>(
      type,
      createAttachmentTypeConfig(label, icon /* , customRenderer*/)
    );
  });
};
