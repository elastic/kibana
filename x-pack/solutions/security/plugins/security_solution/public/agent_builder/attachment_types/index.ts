/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

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
  },
  {
    type: SecurityAgentBuilderAttachments.rule,
    label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.rule.label', {
      defaultMessage: 'Security Rule',
    }),
    icon: 'document',
  },
];

const createAttachmentTypeConfig = (defaultLabel: string, icon: string) => ({
  getLabel: (attachment: UnknownAttachmentWithLabel) => {
    const attachmentLabel = attachment?.data?.attachmentLabel;
    return attachmentLabel ?? defaultLabel;
  },
  getIcon: () => icon,
});

export const registerAttachmentUiDefinitions = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}) => {
  ATTACHMENT_TYPE_CONFIGS.forEach(({ type, label, icon }) => {
    attachments.addAttachmentType<UnknownAttachmentWithLabel>(
      type,
      createAttachmentTypeConfig(label, icon)
    );
  });
};
